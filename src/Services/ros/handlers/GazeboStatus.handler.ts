import ROSLIB from 'roslib';
import { RosBridgeService } from '../ros.service.ts';

/**
 * Subscribes to the latched `/lucy/gazebo_running` topic published by
 * `lucy_control_supervisor` (`std_msgs/Bool`, transient_local QoS).
 *
 *  - `true`  → Gazebo is part of the active launch graph.
 *  - `false` → supervisor running, Gazebo is not (e.g. RViz-only / real hardware).
 *  - `null`  → no value received yet (either disconnected or supervisor not up).
 */
const GAZEBO_RUNNING_TOPIC = '/lucy/gazebo_running';

type Listener = (value: boolean | null) => void;

export class GazeboStatusHandler {
    private static _instance: GazeboStatusHandler | null = null;

    private topic: ROSLIB.Topic | null = null;
    private unsubscribeStatus: (() => void) | null = null;
    private listeners: Set<Listener> = new Set();
    private _value: boolean | null = null;

    private constructor() {
        this.unsubscribeStatus = RosBridgeService.getInstance().onStatusChange((status) => {
            if (status === 'connected') {
                this.initTopic();
            } else if (status === 'disconnected') {
                this.topic?.unsubscribe();
                this.topic = null;
                this.setValue(null);
            }
        });
        if (RosBridgeService.getInstance().isConnected) {
            this.initTopic();
        }
    }

    static getInstance(): GazeboStatusHandler {
        if (!GazeboStatusHandler._instance) {
            GazeboStatusHandler._instance = new GazeboStatusHandler();
        }
        return GazeboStatusHandler._instance;
    }

    get value(): boolean | null {
        return this._value;
    }

    subscribe(cb: Listener): () => void {
        this.listeners.add(cb);
        cb(this._value);
        return () => {
            this.listeners.delete(cb);
        };
    }

    private setValue(v: boolean | null) {
        if (v === this._value) return;
        this._value = v;
        this.listeners.forEach((cb) => cb(v));
    }

    private initTopic() {
        const ros = RosBridgeService.getInstance().rosConnection;
        if (!ros) return;
        this.topic?.unsubscribe();
        this.topic = new ROSLIB.Topic({
            ros,
            name: GAZEBO_RUNNING_TOPIC,
            messageType: 'std_msgs/msg/Bool',
        });
        this.topic.subscribe((msg: ROSLIB.Message) => {
            const data = (msg as unknown as { data?: boolean }).data;
            this.setValue(Boolean(data));
        });
    }

    static cleanup() {
        if (GazeboStatusHandler._instance) {
            GazeboStatusHandler._instance.topic?.unsubscribe();
            GazeboStatusHandler._instance.unsubscribeStatus?.();
            GazeboStatusHandler._instance = null;
        }
    }
}
