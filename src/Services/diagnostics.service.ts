/**
 * Passive recorder for the two debug pipelines.
 *
 * Services and handlers report what they observe; nothing here changes their
 * behaviour, so instrumentation cannot break the paths it is meant to explain.
 *
 * connection: Connect button -> rosbridge -> ROS graph -> robot configuration.
 * command:    slider -> JointTrajectory -> /joint_states -> rendered pose.
 */

export type StageStatus = 'pending' | 'ok' | 'warn' | 'error';
export type PipelineId = 'connection' | 'command';

export interface Stage {
    id: string;
    label: string;
    /** What this step does, shown under the label. */
    hint: string;
    status: StageStatus;
    /** Latest observation: a URL, a topic, a count, an error. */
    detail?: string;
    /** epoch ms of the last update */
    at?: number;
    /** messages seen, for streaming stages */
    count?: number;
}

const CONNECTION_STAGES: Array<Pick<Stage, 'id' | 'label' | 'hint'>> = [
    { id: 'url', label: 'Endpoint resolved', hint: 'Which rosbridge URL the panel will dial' },
    { id: 'socket', label: 'WebSocket open', hint: 'TCP + upgrade to the rosbridge server' },
    { id: 'rosapi', label: 'Attached to a live robot', hint: 'Which nodes publish /joint_states, via rosapi' },
    { id: 'description', label: 'Robot description', hint: '/robot_description from robot_state_publisher (the URDF)' },
    { id: 'hardware', label: 'Robot configuration', hint: 'Hardware YAML: joints, limits, calibration' },
    { id: 'jointstates', label: 'Joint states streaming', hint: '/joint_states — drives the blue dots' },
];

const COMMAND_STAGES: Array<Pick<Stage, 'id' | 'label' | 'hint'>> = [
    { id: 'slider', label: 'Slider moved', hint: 'Panel control changed, in actuator degrees' },
    { id: 'converted', label: 'Converted to radians', hint: 'Actuator degrees mapped to URDF radians' },
    { id: 'published', label: 'JointTrajectory published', hint: 'Sent to the controller command topic' },
    { id: 'controller', label: 'Executed by a controller', hint: 'A ros2_control controller_manager is driving the joints' },
    { id: 'echoed', label: 'Echoed on /joint_states', hint: 'Something reported the joint actually moved' },
    { id: 'rendered', label: 'Pose rendered', hint: 'Forward kinematics ran and the model redrew' },
];

function seed(defs: Array<Pick<Stage, 'id' | 'label' | 'hint'>>): Map<string, Stage> {
    return new Map(defs.map((d) => [d.id, { ...d, status: 'pending' as StageStatus }]));
}

class DiagnosticsService {
    private static _instance: DiagnosticsService | null = null;

    private stages: Record<PipelineId, Map<string, Stage>> = {
        connection: seed(CONNECTION_STAGES),
        command: seed(COMMAND_STAGES),
    };
    private listeners = new Set<() => void>();

    static getInstance(): DiagnosticsService {
        if (!DiagnosticsService._instance) {
            DiagnosticsService._instance = new DiagnosticsService();
        }
        return DiagnosticsService._instance;
    }

    subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private emit() {
        this.listeners.forEach((l) => l());
    }

    /** Update one stage. `count` accumulates when passed as true. */
    record(
        pipeline: PipelineId,
        id: string,
        status: StageStatus,
        detail?: string,
        countUp = false,
    ): void {
        const stage = this.stages[pipeline].get(id);
        if (!stage) return;
        stage.status = status;
        stage.at = Date.now();
        if (detail !== undefined) stage.detail = detail;
        if (countUp) stage.count = (stage.count ?? 0) + 1;
        this.emit();
    }

    /** Drop everything downstream of a lost connection. */
    resetConnection(): void {
        for (const id of ['socket', 'rosapi', 'description', 'hardware', 'jointstates']) {
            const stage = this.stages.connection.get(id);
            if (stage) {
                stage.status = 'pending';
                stage.detail = undefined;
                stage.count = undefined;
            }
        }
        this.emit();
    }

    getStages(pipeline: PipelineId): Stage[] {
        return Array.from(this.stages[pipeline].values());
    }

}

export const Diagnostics = DiagnosticsService.getInstance();
