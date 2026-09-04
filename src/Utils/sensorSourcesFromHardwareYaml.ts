import {
    SENSOR_FLOAT32_ARRAY_MESSAGE_TYPE,
    type SensorSource,
} from '../Constants/rosConfig';

function rosTopic(topic: string): string {
    const trimmed = topic.trim();
    if (!trimmed) return '';
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

/** Human-readable label from a sensor id such as `left_thumb_pressure`. */
export function formatSensorDisplayName(sensorId: string): string {
    return sensorId
        .split('_')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

/**
 * Pressure sensor entries from hardware YAML `sensors` + `boards[].topic_sensors`.
 * Array index matches firmware / mock_sensor ordering: sensors on a board sorted by `virtual_pin`.
 */
export function sensorSourcesFromHardwareYaml(doc: Record<string, unknown>): SensorSource[] {
    const boards = doc.boards;
    const sensors = doc.sensors;
    if (!boards || typeof boards !== 'object' || Array.isArray(boards) || !Array.isArray(sensors)) {
        return [];
    }

    const boardsMap = boards as Record<string, Record<string, unknown>>;
    const byBoard = new Map<string, Record<string, unknown>[]>();

    for (const row of sensors) {
        if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
        const entry = row as Record<string, unknown>;
        if (String(entry.type ?? '').trim() !== 'pressure') continue;

        const boardId = String(entry.board ?? '').trim();
        const id = String(entry.id ?? '').trim();
        if (!boardId || !id) continue;

        const bucket = byBoard.get(boardId) ?? [];
        bucket.push(entry);
        byBoard.set(boardId, bucket);
    }

    const out: SensorSource[] = [];
    for (const [boardId, entries] of byBoard) {
        const board = boardsMap[boardId];
        if (!board) continue;

        const topic = rosTopic(String(board.topic_sensors ?? ''));
        if (!topic) continue;

        entries.sort(
            (a, b) => Number(a.virtual_pin ?? 0) - Number(b.virtual_pin ?? 0),
        );

        entries.forEach((entry, arrayIndex) => {
            const id = String(entry.id).trim();
            out.push({
                id,
                name: formatSensorDisplayName(id),
                topic,
                messageType: SENSOR_FLOAT32_ARRAY_MESSAGE_TYPE,
                arrayIndex,
                type: 'pressure',
                boardId,
            });
        });
    }

    return out.sort((a, b) => a.name.localeCompare(b.name));
}
