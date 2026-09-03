/**
 * Human-readable descriptions for `lucy_client_registry` client IDs.
 *
 * The registry treats IDs as opaque strings, so everything we can say about a
 * peer has to be read back out of the ID itself. Both known clients encode the
 * same shape — `<prefix>_<session start>_<random>`:
 *   - web control panel: `cp_<Date.now() ms>_<4 base36 chars>`
 *   - Lucy CLI:          `cli_<epoch seconds>_<4 digits>`
 */

const CLIENT_KINDS: Record<string, string> = {
    cp: 'another control panel',
    cli: 'the Lucy CLI',
};

/** Milliseconds above which a `cp_` style timestamp is assumed; below it, seconds. */
const EPOCH_MS_THRESHOLD = 1e11;

/** Parses the session-start timestamp out of a client ID, or null when absent/implausible. */
export function clientSessionStart(clientId: string): Date | null {
    const stamp = Number(clientId.split('_')[1]);
    if (!Number.isFinite(stamp) || stamp <= 0) return null;
    const date = new Date(stamp < EPOCH_MS_THRESHOLD ? stamp * 1000 : stamp);
    return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Short phrase naming a client, e.g. `another control panel (since 14:32)`.
 * Falls back to the raw ID for clients we don't know the prefix of.
 */
export function describeClient(clientId: string): string {
    if (clientId === '') return 'nobody';

    const kind = CLIENT_KINDS[clientId.split('_')[0]] ?? `an unknown client (${clientId})`;
    const startedAt = clientSessionStart(clientId);
    if (!startedAt) return kind;

    const time = startedAt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    return `${kind} (since ${time})`;
}
