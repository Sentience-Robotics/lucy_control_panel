/**
 * Structural diff between two hardware YAML documents (system "active" vs editor "target").
 *
 * Used to predict whether applying the target requires a Gazebo restart. The pipeline
 * regenerates `inmoov_ros2_control.xacro`; any change there that the running
 * `gz_ros2_control` plugin reads at robot spawn requires a Gazebo restart (the
 * plugin only loads URDF + ros2_control blocks once per spawn).
 *
 * Server-side ros2_control template fields ⇒ included in the diff:
 *   - board (per actuator)
 *   - urdf_joint (per actuator)
 *   - virtual_pin, servo_type, offset_deg, direction, scale,
 *     servo_min_deg, servo_max_deg, servo_default_deg (per actuator)
 *
 * NOT included (firmware-only or runtime-only):
 *   - actuator.enabled (firmware emits, but ros2_control still exports the joint)
 *   - sensors (firmware only)
 *   - passive_urdf_joints / ignore_urdf_joints (controllers.yaml only,
 *     applied by RELOAD without Gazebo restart)
 */

import { asMapping } from './documentHelpers.ts';

/** Fields of an actuator that are baked into the generated ros2_control xacro. */
const ROS2_CONTROL_ACTUATOR_FIELDS = [
    'board',
    'urdf_joint',
    'virtual_pin',
    'servo_type',
    'offset_deg',
    'direction',
    'scale',
    'servo_min_deg',
    'servo_max_deg',
    'servo_default_deg',
] as const;

type Actuator = Record<string, unknown>;

export interface ActuatorFieldChange {
    field: (typeof ROS2_CONTROL_ACTUATOR_FIELDS)[number];
    before: unknown;
    after: unknown;
}

export interface ActuatorDiffEntry {
    actuatorId: string;
    /** Stable label for the UI — falls back to actuator id. */
    label: string;
    changes: ActuatorFieldChange[];
}

export interface HardwareConfigDiff {
    /** Actuators present in target but missing from active (new in target). */
    actuatorsAdded: { actuatorId: string; label: string }[];
    /** Actuators present in active but removed from target. */
    actuatorsRemoved: { actuatorId: string; label: string }[];
    /** Actuators in both, but with at least one ros2_control field changed. */
    actuatorsModified: ActuatorDiffEntry[];
    /** Boards added in target. */
    boardsAdded: string[];
    /** Boards removed in target. */
    boardsRemoved: string[];
    /** True if any of the above lists is non-empty. */
    requiresGazeboRestart: boolean;
}

function actuatorsFromDoc(doc: Record<string, unknown> | null | undefined): Map<string, Actuator> {
    const out = new Map<string, Actuator>();
    if (!doc || !Array.isArray(doc.actuators)) return out;
    for (const a of doc.actuators) {
        const m = asMapping(a);
        if (!m) continue;
        const id = String(m.id ?? '').trim();
        if (!id) continue;
        out.set(id, m);
    }
    return out;
}

function boardIdsFromDoc(doc: Record<string, unknown> | null | undefined): Set<string> {
    const ids = new Set<string>();
    const boards = asMapping(doc?.boards);
    if (!boards) return ids;
    for (const k of Object.keys(boards)) ids.add(k);
    return ids;
}

function actuatorLabel(a: Actuator, fallbackId: string): string {
    const urdf = String(a.urdf_joint ?? '').trim();
    return urdf ? `${fallbackId} (${urdf})` : fallbackId;
}

function valuesDiffer(before: unknown, after: unknown): boolean {
    // Treat missing/undefined and empty-string-only differences as equal where servo configs
    // typically default; but for the comparison we err on "different" if either is set.
    if (before === after) return false;
    const bs = before === undefined || before === null ? '' : String(before);
    const as_ = after === undefined || after === null ? '' : String(after);
    return bs !== as_;
}

/**
 * Compute the structural diff used to decide if Gazebo restart is required.
 *
 * Accepts null on either side: if `activeDoc` is null we cannot decide, and we
 * return `requiresGazeboRestart=false` with empty lists — callers should not
 * prompt the user in that case.
 */
export function computeHardwareConfigDiff(
    activeDoc: Record<string, unknown> | null | undefined,
    targetDoc: Record<string, unknown> | null | undefined,
): HardwareConfigDiff {
    const active = actuatorsFromDoc(activeDoc);
    const target = actuatorsFromDoc(targetDoc);

    const activeBoards = boardIdsFromDoc(activeDoc);
    const targetBoards = boardIdsFromDoc(targetDoc);

    const actuatorsAdded: { actuatorId: string; label: string }[] = [];
    const actuatorsRemoved: { actuatorId: string; label: string }[] = [];
    const actuatorsModified: ActuatorDiffEntry[] = [];

    for (const [id, ta] of target) {
        if (!active.has(id)) {
            actuatorsAdded.push({ actuatorId: id, label: actuatorLabel(ta, id) });
        }
    }
    for (const [id, aa] of active) {
        if (!target.has(id)) {
            actuatorsRemoved.push({ actuatorId: id, label: actuatorLabel(aa, id) });
        }
    }
    for (const [id, ta] of target) {
        const aa = active.get(id);
        if (!aa) continue;
        const changes: ActuatorFieldChange[] = [];
        for (const field of ROS2_CONTROL_ACTUATOR_FIELDS) {
            if (valuesDiffer(aa[field], ta[field])) {
                changes.push({ field, before: aa[field], after: ta[field] });
            }
        }
        if (changes.length > 0) {
            actuatorsModified.push({ actuatorId: id, label: actuatorLabel(ta, id), changes });
        }
    }

    const boardsAdded: string[] = [];
    const boardsRemoved: string[] = [];
    for (const id of targetBoards) if (!activeBoards.has(id)) boardsAdded.push(id);
    for (const id of activeBoards) if (!targetBoards.has(id)) boardsRemoved.push(id);

    const requiresGazeboRestart =
        actuatorsAdded.length > 0 ||
        actuatorsRemoved.length > 0 ||
        actuatorsModified.length > 0 ||
        boardsAdded.length > 0 ||
        boardsRemoved.length > 0;

    return {
        actuatorsAdded,
        actuatorsRemoved,
        actuatorsModified,
        boardsAdded,
        boardsRemoved,
        requiresGazeboRestart,
    };
}

export function isDiffEmpty(diff: HardwareConfigDiff): boolean {
    return !diff.requiresGazeboRestart;
}
