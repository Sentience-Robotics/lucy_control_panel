import type { ControllerJointConfig } from '../Constants/rosConfig';

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

        const joints = rows
            .map((a) => String((a as Record<string, unknown>).urdf_joint ?? '').trim())
            .filter(Boolean);

        if (joints.length === 0) continue;

        out.push({
            topic: `/${ctrlName}/joint_trajectory`,
            joints,
            defaultCategory: boardIdToCategory(boardId),
        });
    }

    return out;
}
