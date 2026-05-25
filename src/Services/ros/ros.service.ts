/* eslint-disable @typescript-eslint/no-explicit-any */

import ROSLIB from 'roslib';
import { logger } from "../../Utils/logger.utils.ts";

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

/**
 * roslib forwards the raw websocket `error` Event when the bridge is
 * unreachable, which stringifies as "[object Event]" — useless for users.
 * Turn it into actionable guidance that points at the Lucy bringup launch.
 */
function describeRosBridgeFailure(error: unknown, url: string, opts?: { timeout?: boolean }): string {
    const detail = (() => {
        if (opts?.timeout) return `timed out after ${RosBridgeService.CONNECTION_TIMEOUT_MS / 1000}s`;
        if (error instanceof Error) return error.message;
        if (typeof error === 'string') return error;
        if (error && typeof error === 'object' && 'type' in error) {
            const evt = error as Event;
            return evt.type === 'error' ? 'WebSocket error' : evt.type;
        }
        return '';
    })();
    const suffix = detail ? ` (${detail})` : '';
    return [
        `Could not reach the ROS bridge at ${url}${suffix}.`,
        'Launch lucy bringup first:',
        'ros2 launch lucy_bringup lucy.launch.py gazebo:=true rviz:=true',
    ].join('\n');
}

class RosBridgeService {
    private static instance: RosBridgeService;
    private ros: ROSLIB.Ros | null = null;
    private _connectionStatus: ConnectionStatus = 'disconnected';
    private url: string = '';
    private connectionTimeout: NodeJS.Timeout | null = null;
    private statusListeners: ((status: ConnectionStatus) => void)[] = [];
    private pendingConnectReject: ((reason: Error) => void) | null = null;
    static readonly CONNECTION_TIMEOUT_MS = 10000; // 10 seconds

    private setConnectionStatus(status: ConnectionStatus) {
        if (this._connectionStatus !== status) {
            this._connectionStatus = status;
            this.statusListeners.forEach(listener => listener(status));
            logger(`ROS Bridge Status: ${status}`);
        }
    }

    private createConnection(): ROSLIB.Ros {
        const ros = new ROSLIB.Ros({
            url: this.url
        });

        ros.on('connection', () => {
            logger('Connected to ROS bridge.');
            this.clearConnectionTimeout();
            this.setConnectionStatus('connected');
        });

        ros.on('error', (error: any) => {
            logger(`Error connecting to ROS bridge: ${error}`);
            this.clearConnectionTimeout();
            this.setConnectionStatus('disconnected');
        });

        ros.on('close', () => {
            logger('ROS bridge connection closed.');
            this.clearConnectionTimeout();
            this.setConnectionStatus('disconnected');
        });

        return ros;
    }

    private clearConnectionTimeout() {
        if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
        }
    }

    private startConnectionTimeout() {
        this.clearConnectionTimeout();
        this.connectionTimeout = setTimeout(() => {
            logger('Connection timeout reached');
            this.setConnectionStatus('disconnected');
            if (this.ros) {
                this.ros.close();
                this.ros = null;
            }
            if (this.pendingConnectReject) {
                this.pendingConnectReject(
                    new Error(describeRosBridgeFailure(null, this.url, { timeout: true })),
                );
                this.pendingConnectReject = null;
            }
        }, RosBridgeService.CONNECTION_TIMEOUT_MS);
    }

    static getInstance(): RosBridgeService {
        if (!RosBridgeService.instance) {
            RosBridgeService.instance = new RosBridgeService();
        }
        return RosBridgeService.instance;
    }

    get rosConnection(): ROSLIB.Ros | null {
        return this.ros;
    }

    get connectionStatus(): ConnectionStatus {
        return this._connectionStatus;
    }

    get isConnected(): boolean {
        return this._connectionStatus === 'connected';
    }

    get currentUrl(): string {
        return this.url;
    }

    onStatusChange(callback: (status: ConnectionStatus) => void): () => void {
        this.statusListeners.push(callback);
        return () => {
            this.statusListeners = this.statusListeners.filter(listener => listener !== callback);
        };
    }

    async connect(url: string): Promise<void> {
        return new Promise((resolve, reject) => {
            logger(`Attempting to connect to ROS Bridge at ${url}...`);
            if (this._connectionStatus === 'connecting' || this._connectionStatus === 'connected') {
                resolve();
                return;
            }

            this.url = url;

            if (this.ros) {
                this.ros.close();
                this.ros = null;
            }

            this.setConnectionStatus('connecting');
            this.startConnectionTimeout();

            try {
                this.ros = this.createConnection();

                const cleanup = () => {
                    this.ros?.off('connection', onConnect);
                    this.ros?.off('error', onError);
                    this.pendingConnectReject = null;
                };
                const onConnect = () => {
                    cleanup();
                    resolve();
                };
                const onError = (error: any) => {
                    cleanup();
                    reject(new Error(describeRosBridgeFailure(error, this.url)));
                };
                this.pendingConnectReject = (reason: Error) => {
                    cleanup();
                    reject(reason);
                };

                this.ros.on('connection', onConnect);
                this.ros.on('error', onError);
            } catch (error) {
                this.clearConnectionTimeout();
                this.setConnectionStatus('disconnected');
                this.pendingConnectReject = null;
                reject(error instanceof Error ? error : new Error(describeRosBridgeFailure(error, this.url)));
            }
        });
    }

    disconnect(): void {
        this.clearConnectionTimeout();
        if (this.ros) {
            this.ros.close();
            this.ros = null;
        }
        this.pendingConnectReject = null;
        this.setConnectionStatus('disconnected');
    }
}

export {
    RosBridgeService
}
