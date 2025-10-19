import ROSLIB from "roslib";
import { RosBridgeService } from "../ros.service.ts";

export class CameraHandler {
    private static instance: CameraHandler;
    private imageTopic: ROSLIB.Topic | null = null;
    private subscribers: ((imageData: Uint8Array, frameDelay?: number, fps?: number) => void)[] = [];
    private ros: ROSLIB.Ros | null = null;
    private lastFrameTime = 0;
    private frameInterval = 100; // ms between frames ≈ 10 FPS
    private unsubscribeFromStatus: (() => void) | null = null;
    private frameDelay = 0;
    private fps = 0;
    private frameCount = 0;
    private fpsStartTime = 0;

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

    private initializeTopic(
        topicName: string = '/camera/mobius/jpg',
        messageType: string = 'sensor_msgs/msg/CompressedImage'
    ) {
        if (!this.ros) {
            console.warn('Cannot initialize camera topic: ROS connection not available');
            return;
        }

        this.imageTopic = new ROSLIB.Topic({
            ros: this.ros,
            name: topicName,
            messageType: messageType,
        });

        this.imageTopic.subscribe((message: any) => {
            const now = Date.now();
            if (now - this.lastFrameTime < this.frameInterval) {
                return; // Skip frame if it's too soon
            }
            
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

            if (!message.data) {
                return;
            }

            try {
                const binary = atob(message.data);
                const len = binary.length;
                const array = new Uint8Array(len);
                for (let i = 0; i < len; i++) array[i] = binary.charCodeAt(i);

                this.subscribers.forEach(sub => sub(array, this.frameDelay, this.fps));
            } catch (err) {
                console.error('Failed to decode image data:', err);
            }
        });
    }

    subscribeToCamera(
        callback: (imageData: Uint8Array, frameDelay?: number, fps?: number) => void,
        topicName: string = '/camera/mobius/jpg',
        messageType: string = 'sensor_msgs/msg/CompressedImage'
    ) {
        this.subscribers.push(callback);

        if (this.imageTopic) return;

        this.initializeTopic(topicName, messageType);
    }

    unsubscribeFromCamera(callback: (imageData: Uint8Array, frameDelay?: number, fps?: number) => void) {
        this.subscribers = this.subscribers.filter(sub => sub !== callback);
        if (this.subscribers.length === 0 && this.imageTopic) {
            this.imageTopic.unsubscribe();
            this.imageTopic = null;
        }
    }
}
