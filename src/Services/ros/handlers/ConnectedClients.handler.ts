import ROSLIB from "roslib";
import { RosBridgeService } from "../ros.service.ts";

export class ConnectedClientsHandler {
    private static instance: ConnectedClientsHandler;
    private connectedClientsTopic: ROSLIB.Topic | null = null;
    private connectedClientsService: ROSLIB.Service | null = null;
    private ros: ROSLIB.Ros | null = null;
    private unsubscribeFromStatus: (() => void) | null = null;

    public constructor(callback: (count: number) => void) {
        this.unsubscribeFromStatus = RosBridgeService.getInstance().onStatusChange((status) => {
            if (status === 'connected') {
                this.ros = RosBridgeService.getInstance().rosConnection;
                if (!this.connectedClientsTopic) {
                    this.initializeTopic(callback);
                }
                this.getConnectedClientsCount(callback);

            } else if (status === 'disconnected') {
                this.ros = null;
                if (this.connectedClientsTopic) {
                    this.connectedClientsTopic.unsubscribe();
                    this.connectedClientsTopic = null;
                }
                callback(0);
            }
        });

        this.ros = RosBridgeService.getInstance().rosConnection;
    }

    private getConnectedClientsCount(callback: (count: number) => void) {
        if (!this.ros) {
            console.warn('Cannot initialize topic: ROS connection not available');
            return;
        }
        this.connectedClientsService = new ROSLIB.Service({
            ros: this.ros,
            name: '/get_client_count',
            serviceType: 'camera_ros/srv/GetInt',
        });
        const request = new ROSLIB.ServiceRequest({});
        this.connectedClientsService.callService(request, (result: any) => {
            if (result && result.value !== undefined && result.value !== null) {
                callback(result.value);
            }
        });
    }

    static cleanup(): void {
        if (ConnectedClientsHandler.instance && ConnectedClientsHandler.instance.unsubscribeFromStatus) {
            ConnectedClientsHandler.instance.unsubscribeFromStatus();
        }
    }

    private initializeTopic(
        callback: (count: number) => void,
        topicName: string = '/client_count',
        messageType: string = 'std_msgs/msg/Int32'
    ) {
        if (!this.ros) {
            console.warn('Cannot initialize topic: ROS connection not available');
            return;
        }

        this.connectedClientsTopic = new ROSLIB.Topic({
            ros: this.ros,
            name: topicName,
            messageType: messageType,
        });

        this.connectedClientsTopic.subscribe((message: any) => {
            if (message.data !== undefined && message.data !== null && message.data > 0) {
                callback(message.data);
            }
        });
    }

    unsubscribe() {
        if (this.connectedClientsTopic) {
            this.connectedClientsTopic.unsubscribe();
            this.connectedClientsTopic = null;
        }
    }
}
