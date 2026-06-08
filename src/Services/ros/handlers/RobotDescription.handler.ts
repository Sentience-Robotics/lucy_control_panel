import ROSLIB from 'roslib';
import { RosBridgeService } from '../ros.service.ts';

/**
 * Subscribes to the latched `/robot_description` topic published by
 * `robot_state_publisher` (`std_msgs/String`, transient_local QoS) and exposes
 * the full URDF XML as a string, or `null` when nothing has been received yet
 * (disconnected, or robot_state_publisher not up).
 */
const ROBOT_DESCRIPTION_TOPIC = '/robot_description';

type Listener = (urdf: string | null) => void;

export class RobotDescriptionHandler {
    private static _instance: RobotDescriptionHandler | null = null;

    private topic: ROSLIB.Topic | null = null;
    private unsubscribeStatus: (() => void) | null = null;
    private listeners: Set<Listener> = new Set();
    private _urdf: string | null = null;

    private constructor() {
        this.unsubscribeStatus = RosBridgeService.getInstance().onStatusChange((status) => {
            if (status === 'connected') {
                this.initTopic();
            } else if (status === 'disconnected') {
                this.topic?.unsubscribe();
                this.topic = null;
                this.setUrdf(null);
            }
        });
        if (RosBridgeService.getInstance().isConnected) {
            this.initTopic();
        }
    }

    static getInstance(): RobotDescriptionHandler {
        if (!RobotDescriptionHandler._instance) {
            RobotDescriptionHandler._instance = new RobotDescriptionHandler();
        }
        return RobotDescriptionHandler._instance;
    }

    get urdf(): string | null {
        return this._urdf;
    }

    /** Register `cb`, immediately invoked with the current value (may be null). */
    subscribe(cb: Listener): () => void {
        this.listeners.add(cb);
        cb(this._urdf);
        return () => {
            this.listeners.delete(cb);
        };
    }

    private setUrdf(v: string | null) {
        if (v === this._urdf) return;
        this._urdf = v;
        this.listeners.forEach((cb) => cb(v));
    }

    private initTopic() {
        const ros = RosBridgeService.getInstance().rosConnection;
        if (!ros) return;
        this.topic?.unsubscribe();
        this.topic = new ROSLIB.Topic({
            ros,
            name: ROBOT_DESCRIPTION_TOPIC,
            messageType: 'std_msgs/msg/String',
        });
        this.topic.subscribe((msg: ROSLIB.Message) => {
            const data = (msg as unknown as { data?: string }).data;
            this.setUrdf(typeof data === 'string' && data.length > 0 ? data : null);
        });
    }

    static cleanup() {
        if (RobotDescriptionHandler._instance) {
            RobotDescriptionHandler._instance.topic?.unsubscribe();
            RobotDescriptionHandler._instance.unsubscribeStatus?.();
            RobotDescriptionHandler._instance = null;
        }
    }
}
