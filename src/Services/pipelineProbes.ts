/**
 * On-demand probes behind the two diagnostics pipelines.
 *
 * Everything else that feeds Diagnostics is passive: services report what they
 * already do. These two actively ask the ROS graph a question, so they live
 * apart from the passive recorder and are called when someone is looking.
 */

import { RosBridgeService } from './ros/ros.service';
import { Diagnostics, type StageStatus } from './diagnostics.service';

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
 * Ask rosapi who publishes /joint_states.
 *
 * This is what separates "rosbridge is up" from "rosbridge is attached to a
 * live robot", so it costs one service call and is worth running unprompted.
 */
export async function probeConnection(): Promise<void> {
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
    }
}

/** Answer "is ros2_control actually running?" without being asked. */
export async function probeCommand(): Promise<void> {
    Diagnostics.record('command', 'controller', 'pending', 'checking for controller_manager...');
    try {
        const { status, detail } = await probeController();
        Diagnostics.record('command', 'controller', status, detail);
    } catch (error) {
        Diagnostics.record(
            'command',
            'controller',
            'error',
            error instanceof Error ? error.message : String(error),
        );
    }
}

export const PIPELINE_PROBES = {
    connection: probeConnection,
    command: probeCommand,
} as const;

/** Run both probes once, e.g. when the settings panel opens. */
export function refreshAllPipelines(): void {
    void probeConnection();
    void probeCommand();
}
