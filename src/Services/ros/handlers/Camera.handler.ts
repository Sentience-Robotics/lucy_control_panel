import ROSLIB from "roslib";
import { RosBridgeService } from "../ros.service.ts";
import { logger } from "../../../Utils/logger.utils.ts";

export class CameraHandler {
    private static instance: CameraHandler;
    private imageTopic: ROSLIB.Topic | null = null;
    private subscribers: ((imageData: Uint8Array) => void)[] = [];
    private ros: ROSLIB.Ros | null = null;
    private unsubscribeFromStatus: (() => void) | null = null;

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
            queue_length: 1,
            throttle_rate: 0,
        });

        this.imageTopic.subscribe((message: any) => {
            const now = Date.now();
            const messageTimestamp = (message.header.stamp.sec * 1000) + (message.header.stamp.nanosec / 1e6);
            logger(`Received image frame. Message timestamp: ${new Date(messageTimestamp).toISOString()}, Now: ${new Date(now).toISOString()}, Delay: ${now - messageTimestamp} ms`);

            if (!message.data) {
                return;
            }

            try {
                const binary = atob(message.data);
                const len = binary.length;
                const array = new Uint8Array(len);
                for (let i = 0; i < len; i++) array[i] = binary.charCodeAt(i);

                this.subscribers.forEach(sub => sub(array));
            } catch (err) {
                console.error('Failed to decode image data:', err);
            }
        });
    }

    subscribeToCamera(
        callback: (imageData: Uint8Array) => void
    ) {
        this.subscribers.push(callback);

        if (this.imageTopic) return;

        this.initializeTopic();
    }

    unsubscribeFromCamera(callback: (imageData: Uint8Array) => void) {
        this.subscribers = this.subscribers.filter(sub => sub !== callback);
        if (this.subscribers.length === 0 && this.imageTopic) {
            this.imageTopic.unsubscribe();
            this.imageTopic = null;
        }
    }
}
