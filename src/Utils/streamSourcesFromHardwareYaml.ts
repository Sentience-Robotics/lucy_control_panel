import type { StreamSource } from '../Constants/rosConfig';

const CAMERA_META_KEYS = new Set([
    'name',
    'topic',
    'message_type',
    'external',
    'link',
    'sim_gz_topic',
]);

const DEFAULT_CAMERA_MESSAGE_TYPE = 'sensor_msgs/msg/CompressedImage';

function cameraEntryId(entry: Record<string, unknown>): string {
    const explicit = entry.id;
    if (typeof explicit === 'string' && explicit.trim()) {
        return explicit.trim();
    }
    for (const [key, value] of Object.entries(entry)) {
        if (CAMERA_META_KEYS.has(key)) continue;
        if (value === null || value === undefined) {
            return key;
        }
    }
    const topic = typeof entry.topic === 'string' ? entry.topic : '';
    return topic.replace(/^\//, '').replace(/[^\w]+/g, '-') || 'camera';
}

/** Camera stream entries from hardware YAML ``cameras`` (matches active.yaml / lucy_config_generator). */
export function streamSourcesFromHardwareYaml(doc: Record<string, unknown>): StreamSource[] {
    const cameras = doc.cameras;
    if (!Array.isArray(cameras)) return [];

    const out: StreamSource[] = [];
    for (const row of cameras) {
        if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
        const entry = row as Record<string, unknown>;
        const name = typeof entry.name === 'string' ? entry.name.trim() : '';
        const topic = typeof entry.topic === 'string' ? entry.topic.trim() : '';
        if (!name || !topic) continue;

        const messageType =
            typeof entry.message_type === 'string' && entry.message_type.trim()
                ? entry.message_type.trim()
                : DEFAULT_CAMERA_MESSAGE_TYPE;

        out.push({
            id: cameraEntryId(entry),
            name,
            topic,
            messageType,
        });
    }
    return out;
}
