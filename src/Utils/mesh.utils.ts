/*
 * Copyright 2025-2026 Sentience Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { MeshPayload } from '../Services/ros/handlers/Mesh.handler';
import { formatCaughtError } from './error.utils';

export function base64ToUint8Array(b64: string): Uint8Array {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

/** True if buffer looks like binary or ASCII STL (not random zlib garbage). */
export function looksLikeStl(buf: ArrayBuffer): boolean {
    if (buf.byteLength < 84) return false;
    const bytes = new Uint8Array(buf);
    // ASCII STL often starts with "solid"
    const head = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3], bytes[4]);
    if (head.toLowerCase() === 'solid') return true;
    // Binary STL: 80-byte header + uint32 triangle count; size = 84 + n*50
    const view = new DataView(buf);
    const n = view.getUint32(80, true);
    return n > 0 && n < 50_000_000 && buf.byteLength === 84 + n * 50;
}

/**
 * Decode an STL payload from `mesh/get` using the declared encoding.
 * `zlib_base64` is required for current servers; raw base64 only accepted if
 * the bytes already look like an STL (legacy / mislabeled payloads).
 */
export async function decodeStlPayload(payload: MeshPayload): Promise<ArrayBuffer> {
    const bytes = base64ToUint8Array(payload.data);
    const copy = bytes.slice().buffer;

    if (payload.encoding === 'zlib_base64' || payload.encoding === 'zlib+base64') {
        if (typeof DecompressionStream === 'undefined') {
            throw new Error('DecompressionStream is required to decode zlib_base64 STL meshes');
        }
        try {
            const stream = new Blob([copy]).stream().pipeThrough(new DecompressionStream('deflate'));
            const inflated = await new Response(stream).arrayBuffer();
            if (!looksLikeStl(inflated)) {
                throw new Error('inflated STL payload failed format check');
            }
            return inflated;
        } catch (e) {
            throw new Error(
                `failed to inflate zlib_base64 STL: ${formatCaughtError(e)}`,
            );
        }
    }

    // Legacy: uncompressed base64 STL (or encoding omitted and inferred wrongly).
    if (looksLikeStl(copy)) return copy;
    throw new Error(`unsupported STL encoding '${payload.encoding}' (expected zlib_base64)`);
}
