/* eslint-disable @typescript-eslint/no-explicit-any */

import ROSLIB from 'roslib';
import { logger } from "../../Utils/logger.utils.ts";

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export enum ROS_TOPICS {
    LEFT_ARM = 'joints/left_arm',
    RIGHT_ARM = 'joints/right_arm',
}

class RosBridgeService {
    private static instance: RosBridgeService;
    private ros: ROSLIB.Ros | null = null;
    private _connectionStatus: ConnectionStatus = 'disconnected';
    private url: string = '';
    private connectionTimeout: NodeJS.Timeout | null = null;
    private statusListeners: ((status: ConnectionStatus) => void)[] = [];
    private readonly CONNECTION_TIMEOUT_MS = 10000; // 10 seconds

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
            logger('Connected to ROS websocket server.');
            this.clearConnectionTimeout();
            this.setConnectionStatus('connected');
        });

        ros.on('error', (error: any) => {
            logger(`Error connecting to ROS websocket server: ${error}`);
            this.clearConnectionTimeout();
            this.setConnectionStatus('disconnected');
        });

        ros.on('close', () => {
            logger('Connection to ROS websocket server closed.');
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
        }, this.CONNECTION_TIMEOUT_MS);
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

                const onConnect = () => {
                    this.ros?.off('connection', onConnect);
                    this.ros?.off('error', onError);
                    resolve();
                };

                const onError = (error: any) => {
                    this.ros?.off('connection', onConnect);
                    this.ros?.off('error', onError);
                    reject(new Error(`Failed to connect: ${error}`));
                };

                this.ros.on('connection', onConnect);
                this.ros.on('error', onError);
            } catch (error) {
                this.clearConnectionTimeout();
                this.setConnectionStatus('disconnected');
                reject(error);
            }
        });
    }

    async reconnect(url: string): Promise<void> {
        this.setConnectionStatus('reconnecting');
        try {
            await this.connect(url);
        } catch (error) {
            this.setConnectionStatus('disconnected');
            throw error;
        }
    }

    disconnect(): void {
        this.clearConnectionTimeout();
        if (this.ros) {
            this.ros.close();
            this.ros = null;
        }
        this.setConnectionStatus('disconnected');
    }
}

export {
    RosBridgeService
}
