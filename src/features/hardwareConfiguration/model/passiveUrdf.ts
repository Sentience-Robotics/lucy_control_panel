import { asMapping } from './documentHelpers.ts';

/** Mirrors `lucy_config_generator.schema` URDF_*_LIST_KEYS for delete-actuator UX. */
export const URDF_PASSIVE_LIST_KEYS = ['passive_urdf_joints', 'urdf_passive', 'urdf_passive_joints'] as const;
export const URDF_IGNORE_LIST_KEYS = ['ignore_urdf_joints', 'urdf_ignore', 'urdf_ignore_joints'] as const;

export function jointListedUnderKeys(doc: Record<string, unknown>, keys: readonly string[], j: string): boolean {
    for (const key of keys) {
        const arr = doc[key];
        if (!Array.isArray(arr)) continue;
        for (const x of arr) {
            if (typeof x === 'string' && x.trim() === j) return true;
        }
    }
    return false;
}

/** After removing an actuator: record its URDF joint under `passive_urdf_joints` if nothing else maps it. */
export function appendPassiveUrdfJointIfUnassigned(doc: Record<string, unknown>, jointName: string): void {
    const j = jointName.trim();
    if (!j) return;
    const acts = Array.isArray(doc.actuators) ? doc.actuators : [];
    for (const a of acts) {
        const m = asMapping(a);
        if (String(m?.urdf_joint ?? '').trim() === j) return;
    }
    if (jointListedUnderKeys(doc, URDF_IGNORE_LIST_KEYS, j)) return;
    const bag = new Set<string>();
    for (const key of URDF_PASSIVE_LIST_KEYS) {
        const passive = doc[key];
        if (!Array.isArray(passive)) continue;
        for (const x of passive) {
            if (typeof x === 'string' && x.trim()) bag.add(x.trim());
        }
    }
    if (bag.has(j)) return;
    bag.add(j);
    doc.passive_urdf_joints = [...bag].sort();
}
