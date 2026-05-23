import ROSLIB from "roslib";
import { RosBridgeService } from "../ros.service.ts";
import { DEFAULT_STREAM_SOURCE } from "../../../Constants/rosConfig.ts";
import type { StreamSource } from "../../../Constants/rosConfig.ts";

export class CameraHandler {
    private static instance: CameraHandler;
    private imageTopic: ROSLIB.Topic | null = null;
    private subscribers: ((imageData: Uint8Array, frameDelay?: number, fps?: number) => void)[] = [];
    private ros: ROSLIB.Ros | null = null;
    private unsubscribeFromStatus: (() => void) | null = null;
    private frameDelay = 0;
    private fps = 0;
    private frameCount = 0;
    private fpsStartTime = 0;
    private lastFrameTime = 0;
    private currentStreamSource: StreamSource = DEFAULT_STREAM_SOURCE;
    private hasEmptyDataWarning = false;
    private emptyDataWarningCallback: ((hasWarning: boolean) => void) | null = null;

    private constructor() {
        this.unsubscribeFromStatus = RosBridgeService.getInstance().onStatusChange((status) => {
            if (status === 'connected') {
                this.ros = RosBridgeService.getInstance().rosConnection;
                if (this.subscribers.length > 0 && !this.imageTopic) {
                    this.initializeTopic();
                }
            } else if (status === 'disconnected') {
                this.ros = null;
                if (this.imageTopic) {
                    this.imageTopic.unsubscribe();
                    this.imageTopic = null;
                }
            }
        });

        this.ros = RosBridgeService.getInstance().rosConnection;
    }

    static getInstance(): CameraHandler {
        if (!CameraHandler.instance) {
            CameraHandler.instance = new CameraHandler();
        }
        return CameraHandler.instance;
    }

    static cleanup(): void {
        if (CameraHandler.instance && CameraHandler.instance.unsubscribeFromStatus) {
            CameraHandler.instance.unsubscribeFromStatus();
        }
    }

    private resetFpsCounters(): void {
        this.frameCount = 0;
        this.fpsStartTime = 0;
        this.lastFrameTime = 0;
        this.hasEmptyDataWarning = false;
    }

    private updateFpsMetrics(now: number): void {
        // Calculate latency
        this.frameDelay = this.lastFrameTime > 0 ? now - this.lastFrameTime : 0;
        this.lastFrameTime = now;

        // Calculate FPS
        if (this.fpsStartTime === 0) {
            this.fpsStartTime = now;
        }
        this.frameCount++;
        
        // Update FPS every second
        const timeElapsed = now - this.fpsStartTime;
        if (timeElapsed >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / timeElapsed);
            this.frameCount = 0;
            this.fpsStartTime = now;
        }
    }

    private handleEmptyDataWarning(): void {
        if (!this.hasEmptyDataWarning) {
            this.hasEmptyDataWarning = true;
            if (this.emptyDataWarningCallback) {
                this.emptyDataWarningCallback(true);
            }
        }
    }

    private clearEmptyDataWarning(): void {
        if (this.hasEmptyDataWarning) {
            this.hasEmptyDataWarning = false;
            if (this.emptyDataWarningCallback) {
                this.emptyDataWarningCallback(false);
            }
        }
    }

    private decodeImageData(data: string): Uint8Array {
        const binary = atob(data);
        const len = binary.length;
        const array = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            array[i] = binary.charCodeAt(i);
        }
        return array;
    }

    private initializeTopic(streamSource?: StreamSource) {
        if (!this.ros) {
            console.warn('Cannot initialize camera topic: ROS connection not available');
            return;
        }

        // Unsubscribe from current topic if it exists
        if (this.imageTopic) {
            this.imageTopic.unsubscribe();
            this.imageTopic = null;
        }

        // Use provided stream source or current one
        const source = streamSource || this.currentStreamSource;
        this.currentStreamSource = source;

        // Reset FPS counters when switching topics
        this.resetFpsCounters();

        this.imageTopic = new ROSLIB.Topic({
            ros: this.ros,
            name: source.topic,
            messageType: source.messageType,
            queue_length: 1,
            throttle_rate: 0,
        });

        this.imageTopic.subscribe((message: any) => {
            const now = Date.now();
            this.updateFpsMetrics(now);

            if (!message.data || message.data === "") {
                this.handleEmptyDataWarning();
                return;
            }

            this.clearEmptyDataWarning();

            try {
                const imageData = this.decodeImageData(message.data);
                this.subscribers.forEach(sub => sub(imageData, this.frameDelay, this.fps));
            } catch (err) {
                console.error('[CameraHandler] Failed to decode image data:', {
                    error: err,
                    topic: source.topic,
                    sourceName: source.name,
                    dataLength: message.data?.length,
                    dataPreview: message.data?.substring(0, 100)
                });
            }
        });
    }

    switchStreamSource(streamSource: StreamSource) {
        if (this.currentStreamSource.id === streamSource.id) {
            return; // Already using this source
        }

        this.currentStreamSource = streamSource;
        
        // If we have subscribers and ROS is connected, reinitialize with new topic
        if (this.subscribers.length > 0 && this.ros) {
            this.initializeTopic(streamSource);
        }
    }

    getCurrentStreamSource(): StreamSource {
        return this.currentStreamSource;
    }

    setEmptyDataWarningCallback(callback: (hasWarning: boolean) => void) {
        this.emptyDataWarningCallback = callback;
    }

    subscribeToCamera(
        callback: (imageData: Uint8Array, frameDelay?: number, fps?: number) => void,
        streamSource?: StreamSource
    ) {
        this.subscribers.push(callback);

        // If a stream source is provided and it's different, switch to it
        if (streamSource && streamSource.id !== this.currentStreamSource.id) {
            this.switchStreamSource(streamSource);
            return;
        }

        if (this.imageTopic) return;

        this.initializeTopic(streamSource);
    }

    unsubscribeFromCamera(callback: (imageData: Uint8Array, frameDelay?: number, fps?: number) => void) {
        this.subscribers = this.subscribers.filter(sub => sub !== callback);
        if (this.subscribers.length === 0 && this.imageTopic) {
            this.imageTopic.unsubscribe();
            this.imageTopic = null;
        }
    }
}
