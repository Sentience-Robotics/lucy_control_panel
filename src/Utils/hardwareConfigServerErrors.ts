import type { CSSProperties } from 'react';
import type { StructuredValidationLine } from '../Constants/hardwareConfigTypes.ts';

/** Lines that are not JSON structured errors from `format_error_lines`. */
export const UNPARSED_VALIDATION_KEY = '_unparsed';
export const GENERAL_VALIDATION_KEY = '_general';

export interface CellErrorOpts {
    /** Backend `field` key, e.g. `actuators.left_thumb.physical_pin`. Omit to only use row highlighting. */
    exactFieldKey?: string;
    /** Highlight row softly when any error matches this prefix (e.g. `actuators.left_thumb`). */
    rowPrefix?: string;
}

export interface OutlineBorderSet {
    ok: string;
    exact: string;
    row: string;
}

export function parseStructuredValidationLine(raw: string): StructuredValidationLine | null {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    try {
        const o = JSON.parse(trimmed) as Record<string, unknown>;
        const field = typeof o.field === 'string' ? o.field : '';
        const message = typeof o.message === 'string' ? o.message : trimmed;
        const fieldPath = Array.isArray(o.field_path)
            ? o.field_path.filter((x): x is string => typeof x === 'string')
            : field.split('.').filter(Boolean);
        const line = typeof o.line === 'number' ? o.line : undefined;
        const column = typeof o.column === 'number' ? o.column : undefined;
        return { field: field || 'unknown', fieldPath, message, line, column };
    } catch {
        return null;
    }
}

function append(map: Map<string, string[]>, key: string, msg: string) {
    const prev = map.get(key);
    if (prev) prev.push(msg);
    else map.set(key, [msg]);
}

/**
 * Groups structured validation messages by backend `field` key.
 * Non-JSON lines (or parse failures) go under {@link UNPARSED_VALIDATION_KEY}.
 */
export function mapStructuredValidationErrors(lines: string[]): Map<string, string[]> {
    const map = new Map<string, string[]>();
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const parsed = parseStructuredValidationLine(trimmed);
        if (!parsed) {
            append(map, UNPARSED_VALIDATION_KEY, trimmed);
            continue;
        }
        const key =
            parsed.field && parsed.field !== 'unknown' ? parsed.field : GENERAL_VALIDATION_KEY;
        append(map, key, parsed.message);
    }
    return map;
}

function normalizePrefix(prefix: string): { base: string; dot: string } {
    const p = prefix.endsWith('.') ? prefix.slice(0, -1) : prefix;
    return { base: p, dot: `${p}.` };
}

/** Any structured error whose field equals `prefix` or starts with `prefix.` (skips meta buckets). */
export function hasIssueUnderPrefix(server: Map<string, string[]>, prefix: string): boolean {
    const { base, dot } = normalizePrefix(prefix);
    for (const k of server.keys()) {
        if (k === UNPARSED_VALIDATION_KEY || k === GENERAL_VALIDATION_KEY) continue;
        if (k === base || k.startsWith(dot)) return true;
    }
    return false;
}

export function cellOutlineStyle(
    server: Map<string, string[]>,
    opts: CellErrorOpts,
    borders: OutlineBorderSet,
): CSSProperties {
    const ef = opts.exactFieldKey;
    if (ef && (server.get(ef)?.length ?? 0) > 0) {
        return { border: borders.exact, boxShadow: '0 0 6px rgba(255, 77, 79, 0.35)' };
    }
    const rp = opts.rowPrefix;
    if (rp && hasIssueUnderPrefix(server, rp)) {
        return { border: borders.row, boxShadow: '0 0 4px rgba(255, 77, 79, 0.22)' };
    }
    return { border: borders.ok };
}

export function cellTooltipText(server: Map<string, string[]>, opts: CellErrorOpts): string {
    const ef = opts.exactFieldKey;
    const own = ef ? (server.get(ef) ?? []) : [];
    if (own.length) return own.join(' · ');
    const rp = opts.rowPrefix;
    if (rp && hasIssueUnderPrefix(server, rp)) {
        const { base, dot } = normalizePrefix(rp);
        const parts: string[] = [];
        for (const [k, msgs] of server) {
            if (k === UNPARSED_VALIDATION_KEY || k === GENERAL_VALIDATION_KEY) continue;
            if (k === base || k.startsWith(dot)) parts.push(...msgs.map((m) => `${k}: ${m}`));
        }
        return parts.join(' · ');
    }
    return '';
}

export function flattenServerErrors(server: Map<string, string[]>): { field: string; message: string }[] {
    const out: { field: string; message: string }[] = [];
    for (const [field, msgs] of server) {
        for (const message of msgs) out.push({ field, message });
    }
    return out;
}
