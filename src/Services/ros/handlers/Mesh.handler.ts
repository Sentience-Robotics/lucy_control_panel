/*
 * Copyright 2025-2026 Sentience Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ROSLIB from 'roslib';
import { RosBridgeService } from '../ros.service.ts';

/**
 * Fetches a mesh referenced by the URDF over the `mesh/get` service on the
 * `lucy_config_services` node.
 *
 * Encodings (see lucy_msgs/srv/GetMesh.srv):
 *   utf8        — Collada/DAE text
 *   zlib_base64 — zlib-compressed binary (STL), then base64
 */
const MESH_SERVICE_NAME = '/mesh/get';
const MESH_SERVICE_TYPE = 'lucy_msgs/srv/GetMesh';
/** Client-side wait; must stay ≥ rosbridge `default_call_service_timeout`. */
const MESH_SERVICE_TIMEOUT_MS = 60_000;
/** Passed to rosbridge so it does not cancel mid-transfer (default is 5s). */
const MESH_SERVICE_ROSBRIDGE_TIMEOUT_S = 60.0;

export type MeshEncoding = 'utf8' | 'zlib_base64' | string;

export type MeshPayload = {
    data: string;
    encoding: MeshEncoding;
};

/** roslib's public types omit EventEmitter helpers used for service calls. */
type RosWithEmitter = ROSLIB.Ros & {
    idCounter: number;
    once(event: string, listener: (message: RosServiceResponseMessage) => void): void;
    off(event: string, listener?: (message: RosServiceResponseMessage) => void): void;
    callOnConnection(message: Record<string, unknown>): void;
};

type RosServiceResponseMessage = {
    result?: boolean;
    values?: {
        success?: boolean;
        message?: string;
        data?: string;
        encoding?: string;
    } | string;
};

/** Turn rosbridge failedCallback payloads (string | object) into readable text. */
function formatRosServiceError(error: unknown): string {
    if (typeof error === 'string') return error;
    if (error instanceof Error) return error.message;
    try {
        return JSON.stringify(error);
    } catch {
        return String(error);
    }
}

/** Infer encoding for older servers that omit the field. */
function inferEncoding(path: string, encoding: string | undefined): MeshEncoding {
    if (encoding && encoding.trim()) return encoding.trim();
    return path.toLowerCase().endsWith('.stl') ? 'zlib_base64' : 'utf8';
}

export class MeshHandler {
    /** Resolve to mesh payload (data + encoding), or reject on failure/timeout. */
    static getMesh(path: string): Promise<MeshPayload> {
        const ros = RosBridgeService.getInstance().rosConnection as RosWithEmitter | null;
        if (!ros) return Promise.reject(new Error('ROS bridge is not connected.'));

        // Build the call ourselves so we can set rosbridge `timeout` — roslib's
        // Service.callService does not expose that field.
        const callId = `call_service:${MESH_SERVICE_NAME}:${++ros.idCounter}`;

        return new Promise<MeshPayload>((resolve, reject) => {
            const onResponse = (message: RosServiceResponseMessage) => {
                window.clearTimeout(timer);
                if (message.result === false) {
                    reject(new Error(
                        `${formatRosServiceError(message.values)} (${path})`,
                    ));
                    return;
                }
                const values = message.values;
                if (values && typeof values === 'object' && values.success && typeof values.data === 'string') {
                    resolve({
                        data: values.data,
                        encoding: inferEncoding(path, values.encoding),
                    });
                    return;
                }
                const detail = values && typeof values === 'object'
                    ? (values.message || formatRosServiceError(values))
                    : formatRosServiceError(values);
                reject(new Error(detail || `${MESH_SERVICE_NAME} failed for ${path}`));
            };

            const timer = window.setTimeout(
                () => {
                    ros.off(callId, onResponse);
                    reject(new Error(`${MESH_SERVICE_NAME} timed out for ${path}`));
                },
                MESH_SERVICE_TIMEOUT_MS,
            );

            ros.once(callId, onResponse);

            ros.callOnConnection({
                op: 'call_service',
                id: callId,
                service: MESH_SERVICE_NAME,
                type: MESH_SERVICE_TYPE,
                args: { path },
                timeout: MESH_SERVICE_ROSBRIDGE_TIMEOUT_S,
            });
        });
    }
}
