import type { CellErrorOpts } from '../../../Utils/hardwareConfigServerErrors.ts';
import {
    DEFAULT_ACTUATOR_TYPE_FALLBACK,
    DEFAULT_NEW_ACTUATOR_VALUES,
    DEFAULT_NEW_PRESSURE_SENSOR_VALUES,
} from '../../../Constants/hardwareConfigDefaults.ts';
import { listIgnoreUrdfJoints, listPassiveUrdfJoints } from './passiveUrdf.ts';

export function asMapping(v: unknown): Record<string, unknown> | null {
    return v !== null && typeof v === 'object' && !Array.isArray(v)
        ? (v as Record<string, unknown>)
        : null;
}

export function boardSlots(doc: Record<string, unknown>, boardId: string): number {
    const boards = asMapping(doc.boards);
    const b = boards ? asMapping(boards[boardId]) : null;
    const n = b ? Number(b.internal_servo_slots) : NaN;
    return Number.isFinite(n) ? n : 0;
}

export function actOpts(actuatorId: string, field: string): CellErrorOpts {
    return { exactFieldKey: `actuators.${actuatorId}.${field}`, rowPrefix: `actuators.${actuatorId}` };
}

export function sensOpts(sensorId: string, field: string): CellErrorOpts {
    return { exactFieldKey: `sensors.${sensorId}.${field}`, rowPrefix: `sensors.${sensorId}` };
}

export function boardOpts(boardId: string, field: string): CellErrorOpts {
    return { exactFieldKey: `boards.${boardId}.${field}`, rowPrefix: `boards.${boardId}` };
}

export function boardRowOpts(boardId: string): CellErrorOpts {
    return { rowPrefix: `boards.${boardId}` };
}

export function normalizeActuatorType(raw: unknown): string {
    const s = String(raw ?? '').trim().replace(/^["']|["']$/g, '');
    return s || DEFAULT_ACTUATOR_TYPE_FALLBACK;
}

export function sortedBoardIds(doc: Record<string, unknown>): string[] {
    const boards = asMapping(doc.boards);
    return boards ? Object.keys(boards).sort() : [];
}

export function usedUrdfJointsOnOtherRows(actuators: Record<string, unknown>[], exceptIndex: number): Set<string> {
    const s = new Set<string>();
    actuators.forEach((a, i) => {
        if (i === exceptIndex) return;
        const j = String(a?.urdf_joint ?? '').trim();
        if (j) s.add(j);
    });
    return s;
}

/**
 * Build the JOINT select options for one actuator row.
 *
 * `catalog` is the pool of joint names assignable to actuators (typically
 * `assignableUrdfJointsFromYaml(doc)` — passive joints minus ignore minus already-assigned).
 * `usedElsewhere` is the set of joints assigned on *other* actuator rows (defensive filter:
 * a stale entry leaking into `catalog` is still hidden).
 * `currentJoint` is the joint name on the row being edited; it is always kept in the list so
 * legacy rows whose joint is no longer in the pool remain visible (and re-selectable).
 *
 * Options are always selectable — the previous "disable" behaviour produced a fully greyed-out
 * dropdown for any new actuator row (every option was on some other row, current was empty).
 */
export function jointSelectOptions(
    catalog: string[],
    usedElsewhere: Set<string>,
    currentJoint: string,
): { value: string; label: string }[] {
    const cur = currentJoint.trim();
    const ordered: string[] = [];
    const seen = new Set<string>();
    if (cur) {
        ordered.push(cur);
        seen.add(cur);
    }
    const catSorted = [...catalog].sort();
    for (const j of catSorted) {
        if (seen.has(j)) continue;
        if (usedElsewhere.has(j)) continue;
        ordered.push(j);
        seen.add(j);
    }
    return ordered.map((j) => ({ value: j, label: j }));
}

/** Physical pins already claimed on `boardId`, optionally ignoring one actuator or sensor row (YAML array index). */
export function usedPhysicalPinsOnBoardExcluding(
    doc: Record<string, unknown>,
    boardId: string,
    skip: { actuatorIndex?: number; sensorIndex?: number },
): Set<number> {
    const used = new Set<number>();
    if (Array.isArray(doc.actuators)) {
        doc.actuators.forEach((a, i) => {
            if (skip.actuatorIndex !== undefined && i === skip.actuatorIndex) return;
            const m = asMapping(a);
            if (!m || String(m.board ?? '') !== boardId) return;
            const p = Number(m.physical_pin);
            if (Number.isFinite(p)) used.add(p);
        });
    }
    if (Array.isArray(doc.sensors)) {
        doc.sensors.forEach((s, i) => {
            if (skip.sensorIndex !== undefined && i === skip.sensorIndex) return;
            const m = asMapping(s);
            if (!m || String(m.board ?? '') !== boardId) return;
            const p = Number(m.physical_pin);
            if (Number.isFinite(p)) used.add(p);
        });
    }
    return used;
}

export function usedPhysicalPinsOnBoard(doc: Record<string, unknown>, boardId: string): Set<number> {
    return usedPhysicalPinsOnBoardExcluding(doc, boardId, {});
}

/** Available physical connector indices `1..slots` (`internal_servo_slots` YAML key), excluding pins taken by other rows. */
export function physicalPinOptions(slots: number, usedElsewhere: Set<number>, currentPin: number): number[] {
    const opts: number[] = [];
    const cur = Number.isFinite(currentPin) ? currentPin : 1;
    for (let p = 1; p <= slots; p++) {
        if (p === cur || !usedElsewhere.has(p)) opts.push(p);
    }
    return opts;
}

/** Physical pin indices `1..internal_servo_slots` not claimed by an actuator or sensor on this board. */
export function freePhysicalPinsOnBoard(doc: Record<string, unknown>, boardId: string): number[] {
    const slots = boardSlots(doc, boardId);
    if (slots <= 0) return [];
    const used = usedPhysicalPinsOnBoard(doc, boardId);
    const out: number[] = [];
    for (let p = 1; p <= slots; p++) {
        if (!used.has(p)) out.push(p);
    }
    return out;
}

export function actuatorCountOnBoard(doc: Record<string, unknown>, boardId: string): number {
    if (!Array.isArray(doc.actuators)) return 0;
    return doc.actuators.filter((a) => String(asMapping(a)?.board ?? '') === boardId).length;
}

export function sensorCountOnBoard(doc: Record<string, unknown>, boardId: string): number {
    if (!Array.isArray(doc.sensors)) return 0;
    return doc.sensors.filter((s) => String(asMapping(s)?.board ?? '') === boardId).length;
}

/** Keep contiguous sensor virtual_pin 0..n-1 on a board after add/remove (matches lucy_config_generator schema). */
export function renormalizeSensorVirtualPinsOnBoard(sensors: Record<string, unknown>[], boardId: string): void {
    const hits = sensors
        .map((s, idx) => ({
            idx,
            m: asMapping(s),
            vp: Number(asMapping(s)?.virtual_pin),
        }))
        .filter((x) => x.m && String(x.m.board ?? '') === boardId);
    hits.sort((a, b) => (Number.isFinite(a.vp) ? a.vp : 0) - (Number.isFinite(b.vp) ? b.vp : 0));
    hits.forEach((h, ord) => {
        const row = asMapping(sensors[h.idx]);
        if (!row) return;
        sensors[h.idx] = { ...row, virtual_pin: ord };
    });
}

function collectActuatorIds(doc: Record<string, unknown>): Set<string> {
    const ids = new Set<string>();
    if (!Array.isArray(doc.actuators)) return ids;
    for (const a of doc.actuators) {
        const id = String(asMapping(a)?.id ?? '').trim();
        if (id) ids.add(id);
    }
    return ids;
}

function collectSensorIds(doc: Record<string, unknown>): Set<string> {
    const ids = new Set<string>();
    if (!Array.isArray(doc.sensors)) return ids;
    for (const s of doc.sensors) {
        const id = String(asMapping(s)?.id ?? '').trim();
        if (id) ids.add(id);
    }
    return ids;
}

function uniqueActuatorId(doc: Record<string, unknown>, boardId: string, virtualPin: number): string {
    const short = boardId.replace(/^rp2040_/, '');
    const base = `act_${short}_${virtualPin}`;
    const existing = collectActuatorIds(doc);
    let candidate = base;
    let n = 0;
    while (existing.has(candidate)) {
        n += 1;
        candidate = `${base}_${n}`;
    }
    return candidate;
}

function uniquePressureSensorId(doc: Record<string, unknown>, boardId: string, virtualPin: number): string {
    const short = boardId.replace(/^rp2040_/, '');
    const base = `pressure_${short}_${virtualPin}`;
    const existing = collectSensorIds(doc);
    let candidate = base;
    let n = 0;
    while (existing.has(candidate)) {
        n += 1;
        candidate = `${base}_${n}`;
    }
    return candidate;
}

export function defaultNewActuatorRow(doc: Record<string, unknown>, boardId: string): Record<string, unknown> | null {
    const pins = freePhysicalPinsOnBoard(doc, boardId);
    if (pins.length === 0) return null;
    const vp = actuatorCountOnBoard(doc, boardId);
    const id = uniqueActuatorId(doc, boardId, vp);
    return {
        id,
        urdf_joint: '',
        board: boardId,
        virtual_pin: vp,
        physical_pin: pins[0],
        ...DEFAULT_NEW_ACTUATOR_VALUES,
    };
}

export function defaultNewPressureSensorRow(
    doc: Record<string, unknown>,
    associatedActuatorId: string,
): Record<string, unknown> | null {
    const acts = Array.isArray(doc.actuators) ? doc.actuators : [];
    const act = acts.map((a) => asMapping(a)).find((m) => String(m?.id ?? '').trim() === associatedActuatorId);
    if (!act) return null;
    const boardId = String(act.board ?? '').trim();
    if (!boardId) return null;
    const pins = freePhysicalPinsOnBoard(doc, boardId);
    if (pins.length === 0) return null;
    const vp = sensorCountOnBoard(doc, boardId);
    const id = uniquePressureSensorId(doc, boardId, vp);
    return {
        id,
        type: DEFAULT_NEW_PRESSURE_SENSOR_VALUES.type,
        associated_actuator: associatedActuatorId,
        board: boardId,
        virtual_pin: vp,
        physical_pin: pins[0],
        min_value: DEFAULT_NEW_PRESSURE_SENSOR_VALUES.min_value,
        max_value: DEFAULT_NEW_PRESSURE_SENSOR_VALUES.max_value,
        enabled: DEFAULT_NEW_PRESSURE_SENSOR_VALUES.enabled,
    };
}

/**
 * URDF joints currently free to assign to an actuator row.
 *
 * Pool source: `passive_urdf_joints` (and synonyms `urdf_passive`, `urdf_passive_joints`) —
 * the canonical "unassigned URDF joints" list maintained by the editor itself
 * (see `passiveUrdf.ts::appendPassiveUrdfJointIfUnassigned`, fired on delete / clear).
 *
 * Filters:
 *   - Drop anything in `ignore_urdf_joints` (and synonyms): those are URDF joints the operator
 *     never wants exposed as actuator candidates (fixed fingers, helper links, …).
 *   - Drop joints already mapped to any actuator row — they're "taken", not assignable.
 *
 * Note: per-row exclusions (everything assigned on *other* rows while keeping the row's own
 * value visible) are still applied in `jointSelectOptions` for safety.
 */
export function assignableUrdfJointsFromYaml(doc: Record<string, unknown>): string[] {
    const ignore = new Set<string>(listIgnoreUrdfJoints(doc));
    const assigned = new Set<string>();
    if (Array.isArray(doc.actuators)) {
        for (const a of doc.actuators) {
            const m = asMapping(a);
            const j = String(m?.urdf_joint ?? '').trim();
            if (j) assigned.add(j);
        }
    }

    const pool = new Set<string>(listPassiveUrdfJoints(doc));
    return [...pool].filter((j) => !ignore.has(j) && !assigned.has(j)).sort();
}
