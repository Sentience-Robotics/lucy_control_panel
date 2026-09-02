import { useEffect, useState } from 'react';
import { Button, Typography } from 'antd';
import { MovableModal } from './MovableModal';
import { RosBridgeService } from '../Services/ros/ros.service';
import {
    Diagnostics,
    type Stage,
    type StageStatus,
} from '../Services/diagnostics.service';
import {
    UI_ACCENT_GREEN,
    UI_BORDER_DIM,
    UI_ERROR,
    UI_LIST_ROW_BG,
    UI_TEXT_PRIMARY_ON_DARK,
    UI_TEXT_SUBTLE,
    UI_WARNING,
} from '../Constants/uiTheme';

const { Text } = Typography;

const STATUS_COLOR: Record<StageStatus, string> = {
    ok: UI_ACCENT_GREEN,
    warn: UI_WARNING,
    error: UI_ERROR,
    pending: UI_TEXT_SUBTLE,
};

const STATUS_GLYPH: Record<StageStatus, string> = {
    ok: '●',
    warn: '▲',
    error: '✕',
    pending: '○',
};

function ago(at?: number): string {
    if (!at) return '';
    const seconds = Math.round((Date.now() - at) / 1000);
    if (seconds < 1) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    return `${Math.round(seconds / 60)}m ago`;
}

/** Re-render on every diagnostics update, plus a tick so "ago" stays honest. */
export function useDiagnosticsTick(): number {
    const [tick, setTick] = useState(0);
    useEffect(() => {
        const bump = () => setTick((t) => t + 1);
        const unsubscribe = Diagnostics.subscribe(bump);
        const timer = setInterval(bump, 1000);
        return () => {
            unsubscribe();
            clearInterval(timer);
        };
    }, []);
    return tick;
}

export function StageRow({ stage, index }: { stage: Stage; index: number }) {
    return (
        <div
            style={{
                display: 'flex',
                gap: 10,
                padding: '8px 10px',
                background: UI_LIST_ROW_BG,
                borderBottom: `1px solid ${UI_BORDER_DIM}`,
                alignItems: 'flex-start',
            }}
        >
            <span style={{ color: UI_TEXT_SUBTLE, fontFamily: 'monospace', minWidth: 18 }}>
                {index + 1}
            </span>
            <span style={{ color: STATUS_COLOR[stage.status], minWidth: 14 }}>
                {STATUS_GLYPH[stage.status]}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <Text style={{ color: UI_TEXT_PRIMARY_ON_DARK, fontWeight: 600 }}>
                        {stage.label}
                    </Text>
                    <Text style={{ color: UI_TEXT_SUBTLE, fontSize: 11, whiteSpace: 'nowrap' }}>
                        {stage.count != null ? `${stage.count} msg · ` : ''}
                        {ago(stage.at)}
                    </Text>
                </div>
                <div style={{ color: UI_TEXT_SUBTLE, fontSize: 11 }}>{stage.hint}</div>
                {stage.detail && (
                    <div
                        style={{
                            color: STATUS_COLOR[stage.status],
                            fontSize: 11,
                            fontFamily: 'monospace',
                            wordBreak: 'break-all',
                            marginTop: 2,
                        }}
                    >
                        {stage.detail}
                    </div>
                )}
            </div>
        </div>
    );
}


/** Fallback publisher used on platforms where ros2_control cannot run. */
const JOINT_STATE_FALLBACK = 'joint_state_publisher';

/**
 * Distinguish real ros2_control from the stand-in.
 *
 * joint_command_echo mirrors commands straight back onto /joint_states, so the
 * command pipeline goes green whether or not anything is actually driving the
 * robot. Checking for controller_manager is what tells the two apart.
 */
async function probeController(): Promise<{ status: StageStatus; detail: string }> {
    const ros = RosBridgeService.getInstance();
    const [nodes, publishers] = await Promise.all([
        ros.getNodes(),
        ros.getPublishers('/joint_states'),
    ]);
    const hasManager = nodes.some((n) => n.includes('controller_manager'));
    const fallback = publishers.some((p) => p.includes(JOINT_STATE_FALLBACK));

    if (hasManager) {
        return { status: 'ok', detail: `controller_manager running; /joint_states from ${publishers.join(', ') || 'nobody'}` };
    }
    if (fallback) {
        return {
            status: 'warn',
            detail:
                'no controller_manager — commands are mirrored back by joint_command_echo. ' +
                'Motion is instant and open loop: no trajectory interpolation, no hardware.',
        };
    }
    return {
        status: 'error',
        detail: `no controller_manager and no known publisher (${publishers.join(', ') || 'none'}) — nothing executes commands`,
    };
}

/**
 * Connect button -> rosbridge -> ROS graph -> robot configuration.
 *
 * The rosapi probe is on demand: it asks who publishes /joint_states, which
 * separates "rosbridge is up" from "rosbridge is attached to a live robot".
 */
export function ConnectionDebugModal(props: { isVisible: boolean; onClose: () => void }) {
    useDiagnosticsTick();
    const [probing, setProbing] = useState(false);

    const probe = async () => {
        setProbing(true);
        Diagnostics.record('connection', 'rosapi', 'pending', 'asking rosapi...');
        try {
            const publishers = await RosBridgeService.getInstance().getPublishers('/joint_states');
            Diagnostics.record(
                'connection',
                'rosapi',
                publishers.length ? 'ok' : 'warn',
                publishers.length
                    ? `/joint_states published by ${publishers.join(', ')}` +
                      (publishers.some((p) => p.includes(JOINT_STATE_FALLBACK))
                          ? ' (stand-in, not ros2_control)'
                          : '')
                    : 'rosapi answered, but nothing publishes /joint_states',
            );
        } catch (error) {
            Diagnostics.record(
                'connection',
                'rosapi',
                'error',
                error instanceof Error ? error.message : String(error),
            );
        } finally {
            setProbing(false);
        }
    };

    // Costs one service call, so run it on open rather than making it a chore.
    useEffect(() => {
        if (props.isVisible) void probe();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.isVisible]);

    return (
        <MovableModal
            modalName="Connection pipeline"
            isVisible={props.isVisible}
            onClose={props.onClose}
            initialSize={{ w: 460, h: 520 }}
            header={
                <Button size="small" onClick={probe} loading={probing}>
                    Re-probe
                </Button>
            }
        >
            <div style={{ overflowY: 'auto', height: '100%' }}>
                {Diagnostics.getStages('connection').map((stage, i) => (
                    <StageRow key={stage.id} stage={stage} index={i} />
                ))}
            </div>
        </MovableModal>
    );
}

/** Slider -> JointTrajectory -> /joint_states -> rendered pose, with the joints you moved. */
export function CommandDebugModal(props: { isVisible: boolean; onClose: () => void }) {
    useDiagnosticsTick();
    const [checking, setChecking] = useState(false);

    const checkController = async () => {
        setChecking(true);
        Diagnostics.record('command', 'controller', 'pending', 'checking for controller_manager...');
        try {
            const { status, detail } = await probeController();
            Diagnostics.record('command', 'controller', status, detail);
        } catch (error) {
            Diagnostics.record(
                'command', 'controller', 'error',
                error instanceof Error ? error.message : String(error),
            );
        } finally {
            setChecking(false);
        }
    };

    // Answer "is ros2_control actually running?" without being asked.
    useEffect(() => {
        if (props.isVisible) void checkController();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.isVisible]);

    return (
        <MovableModal
            modalName="Command pipeline"
            isVisible={props.isVisible}
            onClose={props.onClose}
            initialSize={{ w: 520, h: 560 }}
            header={
                <Button size="small" onClick={checkController} loading={checking}>
                    Re-check
                </Button>
            }
        >
            <div style={{ overflowY: 'auto', height: '100%' }}>
                {Diagnostics.getStages('command').map((stage, i) => (
                    <StageRow key={stage.id} stage={stage} index={i} />
                ))}

            </div>
        </MovableModal>
    );
}
