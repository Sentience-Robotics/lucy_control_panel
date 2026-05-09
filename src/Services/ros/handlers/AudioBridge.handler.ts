/**
 * Bridges browser microphone to /mic_audio and /audio playback to browser speakers.
 * Mic and speakers can be activated independently.
 * See lucy_ros_api docs/CONTROL_PANEL_AUDIO.md.
 */

import ROSLIB from 'roslib';
import { RosBridgeService } from '../ros.service';
import { AUDIO_TOPICS } from '../../../Constants/rosConfig';

const SAMPLE_RATE = 16000;
const CHANNELS = 1;
const CHUNK_SIZE = 1024;
const FORMAT_INT16 = 8;
/** Delay before treating disconnect as permanent (avoids stopping mic on brief flickers). */
const DISCONNECT_DEBOUNCE_MS = 2500;
/** Interval to re-resume AudioContext if the browser suspends it again. */
const CONTEXT_KEEPALIVE_MS = 1000;

export type AudioBridgeError = 'permission_denied' | 'no_device' | 'ros_disconnected' | 'unknown';

export interface AudioBridgeCallbacks {
    onError?: (error: AudioBridgeError) => void;
}

export class AudioBridgeHandler {
    private static instance: AudioBridgeHandler;
    private ros: ROSLIB.Ros | null = null;
    private micTopic: ROSLIB.Topic | null = null;
    private audioSubTopic: ROSLIB.Topic | null = null;
    private unsubscribeFromStatus: (() => void) | null = null;

    private stream: MediaStream | null = null;
    private audioContext: AudioContext | null = null;
    private scriptNode: ScriptProcessorNode | null = null;
    private sourceNode: MediaStreamAudioSourceNode | null = null;

    private playbackContext: AudioContext | null = null;
    private nextPlayTime = 0;
    private callbacks: AudioBridgeCallbacks = {};
    private disconnectDebounceId: ReturnType<typeof setTimeout> | null = null;
    private contextKeepaliveId: ReturnType<typeof setInterval> | null = null;

    private constructor() {
        this.unsubscribeFromStatus = RosBridgeService.getInstance().onStatusChange((status) => {
            if (status === 'disconnected') {
                this.disconnectDebounceId = setTimeout(() => {
                    this.disconnectDebounceId = null;
                    this.callbacks.onError?.('ros_disconnected');
                    this.stopAll();
                }, DISCONNECT_DEBOUNCE_MS);
            } else {
                if (this.disconnectDebounceId !== null) {
                    clearTimeout(this.disconnectDebounceId);
                    this.disconnectDebounceId = null;
                }
            }
        });
    }

    static getInstance(): AudioBridgeHandler {
        if (!AudioBridgeHandler.instance) {
            AudioBridgeHandler.instance = new AudioBridgeHandler();
        }
        return AudioBridgeHandler.instance;
    }

    setCallbacks(callbacks: AudioBridgeCallbacks): void {
        this.callbacks = callbacks;
    }

    private getRos(): ROSLIB.Ros | null {
        return RosBridgeService.getInstance().rosConnection;
    }

    private buildMicMessage(int16Samples: number[]): ROSLIB.Message {
        const now = Date.now();
        const sec = Math.floor(now / 1000) | 0;
        const nanosec = Math.floor((now % 1000) * 1e6) | 0;
        return new ROSLIB.Message({
            header: {
                frame_id: 'control_panel_mic',
                stamp: { sec, nanosec },
            },
            audio: {
                info: {
                    format: FORMAT_INT16 | 0,
                    channels: CHANNELS | 0,
                    rate: SAMPLE_RATE | 0,
                    chunk: CHUNK_SIZE | 0,
                },
                audio_data: {
                    float32_data: [],
                    int32_data: [],
                    int16_data: int16Samples,
                    int8_data: [],
                    uint8_data: [],
                },
            },
        });
    }

    private float32ToInt16(float32: Float32Array): number[] {
        const out: number[] = [];
        for (let i = 0; i < float32.length; i++) {
            const s = Math.max(-1, Math.min(1, float32[i]));
            const sample = s < 0 ? s * 0x8000 : s * 0x7fff;
            out.push(Math.round(sample) | 0);
        }
        return out;
    }

    async startMic(): Promise<void> {
        if (this.stream !== null) return;

        this.ros = this.getRos();
        if (!this.ros) {
            this.callbacks.onError?.('ros_disconnected');
            return;
        }

        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, sampleRate: SAMPLE_RATE } });
        } catch (e) {
            const err = e as DOMException;
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                this.callbacks.onError?.('permission_denied');
            } else if (err.name === 'NotFoundError') {
                this.callbacks.onError?.('no_device');
            } else {
                this.callbacks.onError?.('unknown');
            }
            return;
        }

        this.audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
        this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);
        // 1 input, 1 output: output required so we can connect to destination and keep the graph running.
        this.scriptNode = this.audioContext.createScriptProcessor(CHUNK_SIZE, 1, 1);

        this.micTopic = new ROSLIB.Topic({
            ros: this.ros,
            name: AUDIO_TOPICS.MIC_AUDIO,
            messageType: AUDIO_TOPICS.MESSAGE_TYPE,
        });

        this.scriptNode.onaudioprocess = (e) => {
            const input = e.inputBuffer.getChannelData(0);
            const int16 = this.float32ToInt16(input);
            if (this.micTopic) {
                this.micTopic.publish(this.buildMicMessage(int16));
            }
            // Output silence so we don't play mic back to speakers (feedback).
            const out = e.outputBuffer.getChannelData(0);
            out.fill(0);
        };
        this.sourceNode.connect(this.scriptNode);
        this.scriptNode.connect(this.audioContext.destination);

        // Browsers keep AudioContext suspended until resumed (e.g. after user gesture).
        // Without this, onaudioprocess never fires and nothing is published to /mic_audio.
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
        // Some browsers re-suspend the context after a few seconds; keep it running so recording continues.
        this.contextKeepaliveId = setInterval(() => {
            if (this.audioContext?.state === 'suspended') {
                this.audioContext.resume();
            }
        }, CONTEXT_KEEPALIVE_MS);
    }

    stopMic(): void {
        if (this.contextKeepaliveId !== null) {
            clearInterval(this.contextKeepaliveId);
            this.contextKeepaliveId = null;
        }
        if (this.scriptNode && this.sourceNode) {
            try {
                this.scriptNode.disconnect();
                this.sourceNode.disconnect();
            } catch {
                // ignore
            }
            this.scriptNode = null;
            this.sourceNode = null;
        }
        if (this.stream) {
            this.stream.getTracks().forEach((t) => t.stop());
            this.stream = null;
        }
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        this.micTopic = null;
    }

    startSpeakers(): void {
        if (this.audioSubTopic !== null) return;

        this.ros = this.getRos();
        if (!this.ros) {
            this.callbacks.onError?.('ros_disconnected');
            return;
        }

        this.playbackContext = new AudioContext();
        this.nextPlayTime = this.playbackContext.currentTime;
        if (this.playbackContext.state === 'suspended') {
            this.playbackContext.resume();
        }

        this.audioSubTopic = new ROSLIB.Topic({
            ros: this.ros,
            name: AUDIO_TOPICS.AUDIO,
            messageType: AUDIO_TOPICS.MESSAGE_TYPE,
        });
        this.audioSubTopic.subscribe((msg: ROSLIB.Message) => {
            this.playAudioChunk(msg as unknown as Record<string, unknown>);
        });
    }

    private playAudioChunk(msg: Record<string, unknown>): void {
        const ctx = this.playbackContext;
        if (!ctx) return;
        if (ctx.state === 'suspended') {
            ctx.resume();
        }
        const audio = msg?.audio as Record<string, unknown> | undefined;
        if (!audio) return;
        const info = audio.info as Record<string, number> | undefined;
        const audioData = audio.audio_data as Record<string, number[] | undefined> | undefined;
        if (!info || !audioData) return;

        const rate = info.rate || 16000;
        const channels = info.channels || 1;
        const float32 = (audioData as Record<string, number[] | undefined>).float32_data;
        const int16Data = (audioData as Record<string, number[] | undefined>).int16_data;
        const hasFloat = float32 && float32.length > 0;
        const hasInt16 = int16Data && int16Data.length > 0;
        if (!hasFloat && !hasInt16) return;

        let samples: Float32Array;
        if (hasFloat) {
            samples = new Float32Array(float32!);
        } else {
            const i16 = int16Data!;
            samples = new Float32Array(i16.length);
            for (let i = 0; i < i16.length; i++) {
                samples[i] = i16[i] / (i16[i] < 0 ? 0x8000 : 0x7fff);
            }
        }

        const numFrames = channels >= 2 && samples.length >= 2 ? Math.floor(samples.length / channels) : samples.length;
        const duration = numFrames / rate;
        const buffer = ctx.createBuffer(channels, numFrames, rate);
        if (channels >= 2 && samples.length >= numFrames * 2) {
            const left = new Float32Array(numFrames);
            const right = new Float32Array(numFrames);
            for (let i = 0; i < numFrames; i++) {
                left[i] = samples[i * 2];
                right[i] = samples[i * 2 + 1];
            }
            buffer.copyToChannel(left, 0, 0);
            buffer.copyToChannel(right, 1, 0);
        } else {
            buffer.getChannelData(0).set(samples);
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        const startTime = Math.max(this.nextPlayTime, ctx.currentTime);
        source.start(startTime);
        this.nextPlayTime = startTime + duration;
    }

    stopSpeakers(): void {
        if (this.audioSubTopic) {
            this.audioSubTopic.unsubscribe();
            this.audioSubTopic = null;
        }
        if (this.playbackContext) {
            this.playbackContext.close();
            this.playbackContext = null;
        }
        this.nextPlayTime = 0;
    }

    private stopAll(): void {
        if (this.disconnectDebounceId !== null) {
            clearTimeout(this.disconnectDebounceId);
            this.disconnectDebounceId = null;
        }
        this.stopMic();
        this.stopSpeakers();
    }

    stop(): void {
        this.stopAll();
    }

    isMicActive(): boolean {
        return this.stream !== null && this.micTopic !== null;
    }

    isSpeakersActive(): boolean {
        return this.audioSubTopic !== null;
    }

    isActive(): boolean {
        return this.isMicActive() || this.isSpeakersActive();
    }

    static cleanup(): void {
        if (AudioBridgeHandler.instance) {
            AudioBridgeHandler.instance.stopAll();
            if (AudioBridgeHandler.instance.unsubscribeFromStatus) {
                AudioBridgeHandler.instance.unsubscribeFromStatus();
            }
        }
    }
}
