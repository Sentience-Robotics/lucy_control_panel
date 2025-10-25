import ROSLIB from "roslib";
import { RosBridgeService } from "../ros.service.ts";

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
    private lastMessageTime = 0;

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
            
            // Calculate network delay using ROS message timestamp
            if (message.header && message.header.stamp) {
                const messageTime = message.header.stamp.secs * 1000 + Math.floor(message.header.stamp.nanosecs / 1000000);
                this.frameDelay = this.lastMessageTime > 0 ? messageTime - this.lastMessageTime : 0;
                this.lastMessageTime = messageTime;
            } else {
                throw new Error('Camera message missing timestamp header. Ensure camera node publishes with proper header.stamp.');
            }

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

        this.initializeTopic();
    }

    unsubscribeFromCamera(callback: (imageData: Uint8Array, frameDelay?: number, fps?: number) => void) {
        this.subscribers = this.subscribers.filter(sub => sub !== callback);
        if (this.subscribers.length === 0 && this.imageTopic) {
            this.imageTopic.unsubscribe();
            this.imageTopic = null;
        }
    }
}
