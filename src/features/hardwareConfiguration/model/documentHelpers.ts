import type { CellErrorOpts } from '../../../Utils/hardwareConfigServerErrors.ts';

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

export function normalizeServoType(raw: unknown): string {
    const s = String(raw ?? '').trim().replace(/^["']|["']$/g, '');
    return s || '270';
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

export function jointSelectOptions(
    catalog: string[],
    usedElsewhere: Set<string>,
    currentJoint: string,
): { value: string; label: string; disabled: boolean }[] {
    const cur = currentJoint.trim();
    const catSorted = [...catalog].sort();
    const ordered: string[] = [];
    const seen = new Set<string>();
    if (cur && !catalog.includes(cur)) {
        ordered.push(cur);
        seen.add(cur);
    }
    for (const j of catSorted) {
        if (!seen.has(j)) {
            ordered.push(j);
            seen.add(j);
        }
    }
    return ordered.map((j) => ({
        value: j,
        label: j,
        disabled: Boolean(j !== cur && usedElsewhere.has(j)),
    }));
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

/** Available physical connector indices `1..slots` (`internal_servo_slots`), excluding pins taken by other rows. */
export function physicalPinOptions(slots: number, usedElsewhere: Set<number>, currentPin: number): number[] {
    const opts: number[] = [];
    const cur = Number.isFinite(currentPin) ? currentPin : 1;
    for (let p = 1; p <= slots; p++) {
        if (p === cur || !usedElsewhere.has(p)) opts.push(p);
    }
    return opts;
}

/** Servo indices `1..internal_servo_slots` not claimed by an actuator or sensor on this board. */
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
        servo_type: '270',
        offset_deg: 0,
        direction: 1,
        scale: 1,
        servo_min_deg: 0,
        servo_max_deg: 270,
        servo_default_deg: 135,
        enabled: false,
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
        type: 'pressure',
        associated_actuator: associatedActuatorId,
        board: boardId,
        virtual_pin: vp,
        physical_pin: pins[0],
        min_value: null,
        max_value: null,
        enabled: true,
    };
}

/** URDF joints allowed for actuators: optional root `candidate_urdf_joints` ∪ each actuator's `urdf_joint`. */
export function catalogUrdfJointsFromYaml(doc: Record<string, unknown>): string[] {
    const names = new Set<string>();
    if (Array.isArray(doc.actuators)) {
        for (const a of doc.actuators) {
            const m = asMapping(a);
            const j = String(m?.urdf_joint ?? '').trim();
            if (j) names.add(j);
        }
    }
    const extra = doc.candidate_urdf_joints;
    if (Array.isArray(extra)) {
        for (const x of extra) {
            if (typeof x === 'string' && x.trim()) names.add(x.trim());
        }
    }
    return [...names].sort();
}
