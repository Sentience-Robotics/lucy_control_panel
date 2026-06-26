import ROSLIB from 'roslib';
import { SENSOR_FLOAT32_ARRAY_MESSAGE_TYPE } from '../../../Constants/rosConfig';
import { RosBridgeService } from '../ros.service.ts';

export type SensorSampleCallback = (value: number, timestampMs: number) => void;

interface SensorListener {
    sensorId: string;
    arrayIndex: number;
    callback: SensorSampleCallback;
}

interface TopicState {
    topic: ROSLIB.Topic;
    listeners: SensorListener[];
}

/**
 * Subscribes to per-board `sensors/<scope>` Float32Array topics and fans out
 * values to individual sensor listeners by array index.
 */
export class SensorHandler {
    private static instance: SensorHandler;
    private topics = new Map<string, TopicState>();
    private unsubscribeFromStatus: (() => void) | null = null;

    private constructor() {
        this.unsubscribeFromStatus = RosBridgeService.getInstance().onStatusChange((status) => {
            if (status === 'disconnected') {
                this.teardownAll();
            }
        });
    }

    static getInstance(): SensorHandler {
        if (!SensorHandler.instance) {
            SensorHandler.instance = new SensorHandler();
        }
        return SensorHandler.instance;
    }

    static cleanup(): void {
        if (SensorHandler.instance?.unsubscribeFromStatus) {
            SensorHandler.instance.unsubscribeFromStatus();
        }
        SensorHandler.instance?.teardownAll();
    }

    private teardownAll(): void {
        for (const state of this.topics.values()) {
            state.topic.unsubscribe();
        }
        this.topics.clear();
    }

    private ensureTopic(topicName: string): TopicState | null {
        const existing = this.topics.get(topicName);
        if (existing) return existing;

        const ros = RosBridgeService.getInstance().rosConnection;
        if (!ros) {
            console.warn('[SensorHandler] Cannot subscribe: ROS connection not available');
            return null;
        }

        const topic = new ROSLIB.Topic({
            ros,
            name: topicName,
            messageType: SENSOR_FLOAT32_ARRAY_MESSAGE_TYPE,
            queue_length: 1,
            throttle_rate: 0,
        });

        const state: TopicState = { topic, listeners: [] };
        topic.subscribe((message: ROSLIB.Message) => {
            const data = (message as unknown as { data?: number[] }).data;
            if (!Array.isArray(data)) return;

            const timestampMs = Date.now();
            for (const listener of state.listeners) {
                if (listener.arrayIndex < 0 || listener.arrayIndex >= data.length) continue;
                listener.callback(data[listener.arrayIndex], timestampMs);
            }
        });

        this.topics.set(topicName, state);
        return state;
    }

    subscribe(
        sensorId: string,
        topicName: string,
        arrayIndex: number,
        callback: SensorSampleCallback,
    ): void {
        const state = this.ensureTopic(topicName);
        if (!state) return;

        const exists = state.listeners.some(
            (listener) =>
                listener.sensorId === sensorId && listener.callback === callback,
        );
        if (exists) return;

        state.listeners.push({ sensorId, arrayIndex, callback });
    }

    unsubscribe(
        sensorId: string,
        topicName: string,
        callback: SensorSampleCallback,
    ): void {
        const state = this.topics.get(topicName);
        if (!state) return;

        state.listeners = state.listeners.filter(
            (listener) =>
                !(listener.sensorId === sensorId && listener.callback === callback),
        );

        if (state.listeners.length === 0) {
            state.topic.unsubscribe();
            this.topics.delete(topicName);
        }
    }
}
