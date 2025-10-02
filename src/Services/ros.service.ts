import ROSLIB from 'roslib';
import { ROS_CONFIG } from '../Constants/rosConfig';
import type { JointControlState } from "../Constants/robotTypes.ts";
import { radianToDegree } from "../Utils/math.utils.ts";

class RosBridgeService {
    private static instance: RosBridgeService;
    private ros: ROSLIB.Ros;
    private _isConnected = false;

    private constructor() {
        this.ros = this.createConnection();
    }

    private createConnection(): ROSLIB.Ros {
        const ros = new ROSLIB.Ros({
            url: import.meta.env.VITE_ROS_BRIDGE_SERVER_URL
        });

        ros.on('connection', () => {
            console.log('Connected to ROS websocket server.');
            this._isConnected = true;
        });

        ros.on('error', (error) => {
            console.log('Error connecting to ROS websocket server: ', error);
            this._isConnected = false;
        });

        ros.on('close', () => {
            console.log('Connection to ROS websocket server closed.');
            this._isConnected = false;
        });

        return ros;
    }

    static getInstance(): RosBridgeService {
        if (!RosBridgeService.instance) {
            RosBridgeService.instance = new RosBridgeService();
        }
        return RosBridgeService.instance;
    }

    get rosConnection(): ROSLIB.Ros {
        return this.ros;
    }

    get isConnected(): boolean {
        return this._isConnected;
    }

    reconnect() {
        console.log('Reconnecting to ROS websocket server...');
        this.ros.close();
        this.ros = this.createConnection();
    }
}

class JointStateHandler {
    private static instance: JointStateHandler;
    private jointStateTopic: ROSLIB.Topic;

    private constructor() {
        const ros = RosBridgeService.getInstance().rosConnection;
        this.jointStateTopic = new ROSLIB.Topic({
            ros: ros,
            name: ROS_CONFIG.jointStateTopic.name,
            messageType: ROS_CONFIG.jointStateTopic.messageType
        });
    }

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

export {
    JointStateHandler,
    RosBridgeService
}