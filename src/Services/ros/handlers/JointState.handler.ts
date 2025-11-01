import ROSLIB from 'roslib';
import { ROS_CONFIG } from '../../../Constants/rosConfig.ts';
import type { JointControlState } from "../../../Constants/robotTypes.ts";
import { radianToDegree } from "../../../Utils/math.utils.ts";
import { RosBridgeService } from "../ros.service.ts";

export class JointStateHandler {
    private static instance: JointStateHandler;
    private jointStateTopic: ROSLIB.Topic | null = null;
    private unsubscribeFromStatus: (() => void) | null = null;
    private topicName: string;

    private constructor(topicName: string = ROS_CONFIG.jointStateTopic.name) {
        this.topicName = topicName;
        this.unsubscribeFromStatus = RosBridgeService.getInstance().onStatusChange((status) => {
            if (status === 'connected') {
                this.initializeTopic();
            } else if (status === 'disconnected') {
                this.jointStateTopic = null;
            }
        });

        this.initializeTopic();
    }

    private initializeTopic() {
        const ros = RosBridgeService.getInstance().rosConnection;
        if (ros) {
            this.jointStateTopic = new ROSLIB.Topic({
                ros: ros,
                name: this.topicName,
                messageType: ROS_CONFIG.jointStateTopic.messageType
            });
        }
    }

    changeTopic(topicName: string) {
        this.topicName = topicName;
        this.initializeTopic();
    }

    static getInstance(): JointStateHandler {
        if (!JointStateHandler.instance) {
            JointStateHandler.instance = new JointStateHandler();
        }
        return JointStateHandler.instance;
    }

    static cleanup(): void {
        if (JointStateHandler.instance && JointStateHandler.instance.unsubscribeFromStatus) {
            JointStateHandler.instance.unsubscribeFromStatus();
        }
    }

    publishJointStates(joints: JointControlState[]) {
        if (!this.jointStateTopic) {
            this.initializeTopic();
        }

        if (!this.jointStateTopic) {
            console.warn('Cannot publish joint states: ROS connection not available');
            return;
        }

        const message = new ROSLIB.Message({
            position: joints.map(j => radianToDegree(j.currentValue)),
        });
        this.jointStateTopic.publish(message);
    }
}
