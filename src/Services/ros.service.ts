import ROSLIB from 'roslib';
import { ROS_CONFIG } from '../Constants/rosConfig';
import type { JointControlState } from "../Constants/robotTypes.ts";
import { radianToDegree } from "../Utils/math.utils.ts";

const ros = new ROSLIB.Ros({
    url: import.meta.env.VITE_ROS_BRIDGE_SERVER_URL
});

ros.on('connection', function() {
    console.log('Connected to ROS websocket server.');
});

ros.on('error', function(error) {
    console.log('Error connecting to ROS websocket server: ', error);
});

ros.on('close', function() {
    console.log('Connection to ROS websocket server closed.');
});

export class JointStateHandler {
    private static instance: JointStateHandler;
    jointStateTopic = new ROSLIB.Topic({
        ros: ros,
        name: ROS_CONFIG.jointStateTopic.name,
        messageType: ROS_CONFIG.jointStateTopic.messageType
    });

    private constructor() {}

    static getInstance(): JointStateHandler {
        if (!JointStateHandler.instance) {
            JointStateHandler.instance = new JointStateHandler();
        }
        return JointStateHandler.instance;
    }

    publishJointStates(joints: JointControlState[]) {
        const message = new ROSLIB.Message({
            position: joints.map(j => radianToDegree(j.currentValue)),
        });
        this.jointStateTopic.publish(message);
    }
}
