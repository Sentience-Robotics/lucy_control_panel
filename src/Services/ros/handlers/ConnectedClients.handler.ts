import ROSLIB from "roslib";
import { RosBridgeService } from "../ros.service.ts";
import { ControlModeHandler } from "./ControlMode.handler.ts";

export class ConnectedClientsHandler {
    private static instance: ConnectedClientsHandler;
    private connectedClientsTopic: ROSLIB.Topic | null = null;
    private connectedClientsService: ROSLIB.Service | null = null;
    private ros: ROSLIB.Ros | null = null;
    private unsubscribeFromStatus: (() => void) | null = null;

    public constructor(callback: (count: number) => void) {
        // ControlModeHandler owns our heartbeat; without it we wouldn't be counted.
        ControlModeHandler.getInstance();
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

        if (RosBridgeService.getInstance().connectionStatus === 'connected') {
            if (!this.connectedClientsTopic) {
                this.initializeTopic(callback);
            }
            this.getConnectedClientsCount(callback);
        }
    }

    private getConnectedClientsCount(callback: (count: number) => void) {
        if (!this.ros) {
            console.warn('Cannot initialize topic: ROS connection not available');
            return;
        }
        this.connectedClientsService = new ROSLIB.Service({
            ros: this.ros,
            name: '/lucy/get_client_count',
            serviceType: 'lucy_msgs/srv/GetInt',
        });
        const request = new ROSLIB.ServiceRequest({});
        this.connectedClientsService.callService(request, (result: ROSLIB.ServiceResponse) => {
            const value = (result as unknown as { value?: number }).value;
            if (value !== undefined && value !== null) {
                callback(value);
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
        topicName: string = '/lucy/client_count',
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

        this.connectedClientsTopic.subscribe((message: ROSLIB.Message) => {
            const data = (message as unknown as { data?: number }).data;
            if (data !== undefined && data !== null && data > 0) {
                callback(data);
            }
        });
    }

    unsubscribe() {
        if (this.connectedClientsTopic) {
            this.connectedClientsTopic.unsubscribe();
            this.connectedClientsTopic = null;
        }
        this.unsubscribeFromStatus?.();
        this.unsubscribeFromStatus = null;
    }
}
