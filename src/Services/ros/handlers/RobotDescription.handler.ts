import ROSLIB from 'roslib';
import { RosBridgeService } from '../ros.service.ts';

/**
 * Exposes the robot's URDF XML, or `null` when nothing has been received yet.
 *
 * Read from robot_state_publisher's `robot_description` parameter rather than
 * the latched topic: rosbridge fixes a subscription's durability when it is
 * created and its subscribe op takes no QoS field, so subscribing before
 * robot_state_publisher exists yields a VOLATILE subscription that can never
 * receive the latched message. The topic stays subscribed for republishes.
 */
const ROBOT_DESCRIPTION_TOPIC = '/robot_description';
const PARAM_SERVICE = '/robot_state_publisher/get_parameters';
const PARAM_SERVICE_TYPE = 'rcl_interfaces/srv/GetParameters';
const PARAM_NAME = 'robot_description';
/** rcl_interfaces/msg/ParameterType.PARAMETER_STRING */
const PARAMETER_STRING = 4;

/** First retry delay; doubles up to FETCH_MAX_DELAY_MS. */
const FETCH_DELAY_MS = 2000;
const FETCH_MAX_DELAY_MS = 15000;

type Listener = (urdf: string | null) => void;

export class RobotDescriptionHandler {
    private static _instance: RobotDescriptionHandler | null = null;

    private topic: ROSLIB.Topic | null = null;
    private unsubscribeStatus: (() => void) | null = null;
    private listeners: Set<Listener> = new Set();
    private _urdf: string | null = null;
    private retryTimer: ReturnType<typeof setTimeout> | null = null;
    private retryDelay: number = FETCH_DELAY_MS;

    private constructor() {
        this.unsubscribeStatus = RosBridgeService.getInstance().onStatusChange((status) => {
            if (status === 'connected') {
                this.initTopic();
                void this.fetchUrdf();
            } else if (status === 'disconnected') {
                this.cancelRetry();
                this.retryDelay = FETCH_DELAY_MS;
                this.topic?.unsubscribe();
                this.topic = null;
                this.setUrdf(null);
            }
        });
        if (RosBridgeService.getInstance().isConnected) {
            this.initTopic();
            void this.fetchUrdf();
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

    /** Fetch now rather than waiting out the backoff (the Retry button). */
    resubscribe() {
        this.cancelRetry();
        this.retryDelay = FETCH_DELAY_MS;
        this.initTopic();
        void this.fetchUrdf();
    }

    private setUrdf(v: string | null) {
        if (v !== null) this.cancelRetry();
        if (v === this._urdf) return;
        this._urdf = v;
        this.listeners.forEach((cb) => cb(v));
    }

    private cancelRetry() {
        if (this.retryTimer !== null) {
            clearTimeout(this.retryTimer);
            this.retryTimer = null;
        }
    }

    private scheduleRetry() {
        this.cancelRetry();
        const delay = this.retryDelay;
        this.retryDelay = Math.min(this.retryDelay * 2, FETCH_MAX_DELAY_MS);
        this.retryTimer = setTimeout(() => {
            this.retryTimer = null;
            if (this._urdf === null) void this.fetchUrdf();
        }, delay);
    }

    /** Read robot_state_publisher's `robot_description` parameter. */
    private fetchUrdf(): Promise<void> {
        const ros = RosBridgeService.getInstance().rosConnection;
        if (!ros) return Promise.resolve();
        return new Promise<void>((resolve) => {
            const svc = new ROSLIB.Service({
                ros,
                name: PARAM_SERVICE,
                serviceType: PARAM_SERVICE_TYPE,
            });
            const req = new ROSLIB.ServiceRequest({ names: [PARAM_NAME] });
            svc.callService(
                req,
                (result: { values?: Array<{ type?: number; string_value?: string }> }) => {
                    // `values` here is GetParameters.Response.values.
                    const value = result?.values?.[0];
                    const xml = value?.type === PARAMETER_STRING ? value.string_value : '';
                    if (xml) this.setUrdf(xml);
                    else this.scheduleRetry();
                    resolve();
                },
                () => {
                    this.scheduleRetry();
                    resolve();
                },
            );
        });
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
            if (typeof data === 'string' && data.length > 0) this.setUrdf(data);
        });
    }

    static cleanup() {
        if (RobotDescriptionHandler._instance) {
            RobotDescriptionHandler._instance.cancelRetry();
            RobotDescriptionHandler._instance.topic?.unsubscribe();
            RobotDescriptionHandler._instance.unsubscribeStatus?.();
            RobotDescriptionHandler._instance = null;
        }
    }
}
