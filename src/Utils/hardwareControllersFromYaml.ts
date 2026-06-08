import type { ControllerJointConfig, JointLimitDeg, JointMapping } from '../Constants/rosConfig';
import { DEFAULT_ACTUATOR_MAPPING } from './actuatorJointMapping';

function readMapping(row: Record<string, unknown>): JointMapping {
    const offsetDeg = Number(row.offset_deg);
    const direction = Number(row.direction);
    const scale = Number(row.scale);
    return {
        offsetDeg: Number.isFinite(offsetDeg) ? offsetDeg : DEFAULT_ACTUATOR_MAPPING.offsetDeg,
        direction: Number.isFinite(direction) && direction !== 0
            ? direction
            : DEFAULT_ACTUATOR_MAPPING.direction,
        scale: Number.isFinite(scale) && scale !== 0 ? scale : DEFAULT_ACTUATOR_MAPPING.scale,
    };
}

function boardIdToCategory(boardId: string): string {
    const tail = boardId.replace(/^rp2040_/, '');
    return tail.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function controllerName(boardRow: Record<string, unknown>): string | null {
    const c = boardRow.controller;
    if (!c || typeof c !== 'object' || Array.isArray(c)) return null;
    const name = (c as Record<string, unknown>).name;
    return typeof name === 'string' && name.trim() ? name.trim() : null;
}

/** Builds ros2_control-style trajectory topics + joint order from saved hardware YAML (matches lucy_config_generator board ordering). */
export function controllerJointConfigsFromHardwareYaml(doc: Record<string, unknown>): ControllerJointConfig[] {
    const boards = doc.boards;
    if (!boards || typeof boards !== 'object' || Array.isArray(boards)) return [];

    const actuators = Array.isArray(doc.actuators) ? doc.actuators : [];
    const out: ControllerJointConfig[] = [];

    for (const boardId of Object.keys(boards as Record<string, unknown>)) {
        const bdef = (boards as Record<string, unknown>)[boardId];
        if (!bdef || typeof bdef !== 'object' || Array.isArray(bdef)) continue;
        const bObj = bdef as Record<string, unknown>;
        const ctrlName = controllerName(bObj);
        if (!ctrlName) continue;

        const rows = actuators
            .filter((a) => {
                if (!a || typeof a !== 'object' || Array.isArray(a)) return false;
                return String((a as Record<string, unknown>).board ?? '') === boardId;
            })
            .slice()
            .sort(
                (a, b) =>
                    Number((a as Record<string, unknown>).virtual_pin) -
                    Number((b as Record<string, unknown>).virtual_pin),
            );

        const joints: string[] = [];
        const jointLimits: Record<string, JointLimitDeg> = {};
        const jointDisplayNames: Record<string, string> = {};

        for (const row of rows) {
            const r = row as Record<string, unknown>;
            const joint = String(r.urdf_joint ?? '').trim();
            if (!joint) continue;
            joints.push(joint);

            const actuatorId = String(r.id ?? '').trim();
            if (actuatorId) {
                jointDisplayNames[joint] = actuatorId;
            }

            const minDeg = Number(r.servo_min_deg);
            const maxDeg = Number(r.servo_max_deg);
            const defaultDeg = Number(r.servo_default_deg);
            if (Number.isFinite(minDeg) && Number.isFinite(maxDeg) && minDeg < maxDeg) {
                jointLimits[joint] = {
                    minDeg,
                    maxDeg,
                    defaultDeg: Number.isFinite(defaultDeg) ? defaultDeg : (minDeg + maxDeg) / 2,
                    mapping: readMapping(r),
                };
            }
        }

        if (joints.length === 0) continue;

        out.push({
            topic: `/${ctrlName}/joint_trajectory`,
            joints,
            defaultCategory: boardIdToCategory(boardId),
            ...(Object.keys(jointLimits).length > 0 && { jointLimits }),
            ...(Object.keys(jointDisplayNames).length > 0 && { jointDisplayNames }),
        });
    }

    return out;
}
