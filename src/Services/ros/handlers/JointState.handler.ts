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
                this.jointStateTopic?.unsubscribe();
                this.jointStateTopic = null;
            }
        });

        this.initializeTopic();
    }

    private initializeTopic() {
        const ros = RosBridgeService.getInstance().rosConnection;
        if (ros) {
            if (this.jointStateTopic) {
                this.jointStateTopic.unsubscribe();
            }
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
        if (JointStateHandler.instance) {
            if (JointStateHandler.instance.jointStateTopic) {
                JointStateHandler.instance.jointStateTopic.unsubscribe();
                JointStateHandler.instance.jointStateTopic = null;
            }
            if (JointStateHandler.instance.unsubscribeFromStatus) {
                JointStateHandler.instance.unsubscribeFromStatus();
            }
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

    getJoints(): JointControlState[] {
        /* Fixtures for first demo - awaiting servos indications in urdf */
        const max_hand_angle = 5.236; // approx 300 degrees in radians
        return [
            { name: 'right_shoulder_yaw_joint', currentValue: 2.79, targetValue: 2.79, minValue: 0, maxValue: max_hand_angle, type: 'revolute', category: undefined },
            { name: 'right_shoulder_roll_joint', currentValue: 3.14, targetValue: 3.14, minValue: 0, maxValue: max_hand_angle, type: 'revolute', category: undefined },
            { name: 'right_elbow_joint', currentValue: 1.74, targetValue: 1.74, minValue: 0, maxValue: max_hand_angle, type: 'revolute', category: undefined },
            { name: 'right_wrist_joint', currentValue: 2.62, targetValue: 2.62, minValue: 0, maxValue: max_hand_angle, type: 'revolute', category: undefined },
            { name: 'right_thumb_joint', currentValue: 0, targetValue: 0, minValue: 0, maxValue: max_hand_angle, type: 'revolute', category: undefined },
            { name: 'right_index_joint', currentValue: 0, targetValue: 0, minValue: 0, maxValue: max_hand_angle, type: 'revolute', category: undefined },
            { name: 'right_middle_joint', currentValue: 0, targetValue: 0, minValue: 0, maxValue: max_hand_angle, type: 'revolute', category: undefined },
            { name: 'right_ring_joint', currentValue: 0, targetValue: 0, minValue: 0, maxValue: max_hand_angle, type: 'revolute', category: undefined },
            { name: 'right_pinky_joint', currentValue: 0, targetValue: 0, minValue: 0, maxValue: max_hand_angle, type: 'revolute', category: undefined },
        ];
    }
}
