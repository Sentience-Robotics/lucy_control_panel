/**
 * ROS transport only: streams `ConfigurePipeline` action feedback/results from
 * `lucy_config_pipeline` through rosbridge.
 *
 * Uses rosbridge ROS 2 `send_action_goal` / `action_feedback` / `action_result` ops.
 * The stock `ROSLIB.ActionClient` is ROS 1–style (topics + `*Goal` message types) and
 * does not match ROS 2 generated types (`lucy_msgs.action.ConfigurePipeline.Goal`).
 */
import ROSLIB from 'roslib';
import {
    CONFIGURE_PIPELINE_ACTION_INTERFACE,
    CONFIGURE_PIPELINE_SERVER_NAME,
} from '../../../Constants/hardwareConfigRos.ts';
import type {
    ConfigurePipelineFeedbackNormalized,
    ConfigurePipelineGoalInput,
    ConfigurePipelineResultNormalized,
} from '../../../Constants/hardwareConfigTypes.ts';
import { RosBridgeService } from '../ros.service.ts';

const DEFAULT_GOAL_TIMEOUT_MS = 720_000; // firmware build + flash can be slow

type RosWithConnection = ROSLIB.Ros & {
    callOnConnection: (message: Record<string, unknown>) => void;
};

function getRos(): RosWithConnection | null {
    const r = RosBridgeService.getInstance().rosConnection;
    return r as RosWithConnection | null;
}

function asRecord(v: unknown): Record<string, unknown> | null {
    return v !== null && typeof v === 'object' && !Array.isArray(v)
        ? (v as Record<string, unknown>)
        : null;
}

export function normalizeConfigurePipelineFeedback(raw: unknown): ConfigurePipelineFeedbackNormalized {
    const root = asRecord(raw);
    const fromValues = root && 'values' in root ? asRecord(root.values) : null;
    const o =
        fromValues ??
        (root && 'feedback' in root ? asRecord(root.feedback) ?? {} : root ?? {});
    const phase = String(o.phase ?? '');
    const board = String(o.board ?? '');
    let detail = typeof o.detail === 'string' ? o.detail : '';
    const pn = typeof o.progress === 'number' ? o.progress : Number(o.progress ?? 0);
    const progress = Number.isFinite(pn) ? Math.min(1, Math.max(0, pn)) : 0;
    const trimmed = detail.trim();
    if (trimmed.startsWith('{')) {
        try {
            const j = JSON.parse(trimmed) as { message?: string };
            if (typeof j?.message === 'string') detail = j.message;
        } catch {
            /* keep detail string */
        }
    }
    return { phase, board, progress, detail };
}

export function normalizeConfigurePipelineResult(raw: unknown): ConfigurePipelineResultNormalized {
    const root = asRecord(raw);
    if (root && root.result === false) {
        const errText = typeof root.values === 'string' ? root.values : 'ConfigurePipeline failed';
        return {
            success: false,
            message: errText,
            config_name: '',
            boards_flashed: [],
            errors: [errText],
        };
    }
    const o =
        root && typeof root.values === 'object' && root.values !== null
            ? asRecord(root.values) ?? {}
            : root && 'result' in root
              ? asRecord(root.result) ?? {}
              : root ?? {};
    const errs = Array.isArray(o.errors) ? o.errors.filter((x): x is string => typeof x === 'string') : [];
    const flashed = Array.isArray(o.boards_flashed)
        ? o.boards_flashed.filter((x): x is string => typeof x === 'string')
        : [];
    return {
        success: Boolean(o.success),
        message: typeof o.message === 'string' ? o.message : '',
        config_name: typeof o.config_name === 'string' ? o.config_name : '',
        boards_flashed: flashed,
        errors: errs,
    };
}

export interface RunConfigurePipelineCallbacks {
    onFeedback?: (f: ConfigurePipelineFeedbackNormalized) => void;
}

export interface ConfigurePipelineRunHandle {
    promise: Promise<ConfigurePipelineResultNormalized>;
    abort: () => void;
}

type WebSocketWithPrev = WebSocket & { __lucyPrevOnMessage?: ((ev: MessageEvent) => void) | null };

/** Rosbridge JSON ops are not forwarded by roslib's SocketAdapter; tap the socket after roslib runs. */
function tapRosbridgeJson(
    ros: RosWithConnection,
    onJson: (msg: Record<string, unknown>) => void,
): () => void {
    const sock = (ros as unknown as { socket?: WebSocket }).socket;
    if (!sock) {
        return () => {};
    }
    const ws = sock as WebSocketWithPrev;
    const prev = ws.onmessage;
    ws.__lucyPrevOnMessage = prev ?? null;
    ws.onmessage = (event: MessageEvent) => {
        if (typeof prev === 'function') {
            try {
                prev.call(ws, event);
            } catch {
                /* roslib */
            }
        }
        try {
            const text = typeof event.data === 'string' ? event.data : '';
            if (!text) return;
            const msg = JSON.parse(text) as Record<string, unknown>;
            onJson(msg);
        } catch {
            /* non-JSON / binary */
        }
    };
    return () => {
        ws.onmessage = ws.__lucyPrevOnMessage ?? prev;
        delete ws.__lucyPrevOnMessage;
    };
}

let configurePipelineRunLock = false;

/**
 * Sends one action goal and resolves when `action_result` is received; rejects on timeout or disconnect.
 */
export function startConfigurePipeline(
    input: ConfigurePipelineGoalInput,
    callbacks?: RunConfigurePipelineCallbacks,
    timeoutMs: number = DEFAULT_GOAL_TIMEOUT_MS,
): ConfigurePipelineRunHandle {
    const ros = getRos();
    if (!ros) {
        return {
            promise: Promise.reject(new Error('ROS bridge is not connected.')),
            abort: () => {},
        };
    }

    if (configurePipelineRunLock) {
        return {
            promise: Promise.reject(new Error('ConfigurePipeline is already running.')),
            abort: () => {},
        };
    }

    const goalId = `configure_pipeline_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const action = CONFIGURE_PIPELINE_SERVER_NAME;
    const actionType = CONFIGURE_PIPELINE_ACTION_INTERFACE;

    const args: Record<string, unknown> = {
        robot_package: input.robot_package,
        mapping_file: input.mapping_file,
        boards_to_flash: input.boards_to_flash,
        dry_run: input.dry_run,
        build_only: input.build_only,
    };

    let settled = false;
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    let untap: (() => void) | null = null;

    const finalize = () => {
        if (timeoutHandle !== null) {
            clearTimeout(timeoutHandle);
            timeoutHandle = null;
        }
        if (untap) {
            untap();
            untap = null;
        }
        configurePipelineRunLock = false;
    };

    let abortFn: () => void = () => {};
    configurePipelineRunLock = true;

    const promise = new Promise<ConfigurePipelineResultNormalized>((resolve, reject) => {
        const fail = (err: Error) => {
            if (settled) return;
            settled = true;
            finalize();
            reject(err);
        };
        const ok = (v: ConfigurePipelineResultNormalized) => {
            if (settled) return;
            settled = true;
            finalize();
            resolve(v);
        };

        const onJson = (msg: Record<string, unknown>) => {
            if (msg.id !== goalId) return;
            if (msg.op === 'action_feedback') {
                callbacks?.onFeedback?.(normalizeConfigurePipelineFeedback(msg));
            } else if (msg.op === 'action_result') {
                if (msg.result === true) {
                    ok(normalizeConfigurePipelineResult(msg));
                } else {
                    fail(new Error(normalizeConfigurePipelineResult(msg).message || 'ConfigurePipeline failed'));
                }
            }
        };

        untap = tapRosbridgeJson(ros, onJson);

        timeoutHandle = setTimeout(() => {
            fail(new Error(`ConfigurePipeline timed out after ${timeoutMs}ms`));
        }, timeoutMs);

        abortFn = () => {
            if (settled) return;
            try {
                ros.callOnConnection({
                    op: 'cancel_action_goal',
                    id: goalId,
                    action,
                });
            } catch {
                /* ignore */
            }
            fail(new Error('ConfigurePipeline aborted.'));
        };

        try {
            ros.callOnConnection({
                op: 'send_action_goal',
                id: goalId,
                action,
                action_type: actionType,
                feedback: true,
                args,
            });
        } catch (e) {
            fail(e instanceof Error ? e : new Error('Failed to send action goal'));
        }
    });

    return { promise, abort: () => abortFn() };
}
