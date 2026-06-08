import ROSLIB from 'roslib';
import { RosBridgeService } from '../ros.service.ts';

const CONTROL_MODE_TOPIC = '/control_panel_active_client';

// Unique ID for this browser session — stays stable for the page lifetime.
const CLIENT_ID = `cp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

type ControlTakenCallback = () => void;
type ControllerChangedCallback = (activeClientId: string) => void;

/**
 * Coordinates "who has control" across multiple clients connected to the same rosbridge.
 *
 * Protocol:
 *  - Taking control   → publish this client's CLIENT_ID on CONTROL_MODE_TOPIC
 *  - Releasing control → publish empty string
 *  - Any client that receives a non-empty ID different from its own knows someone
 *    else is controlling and should turn off publishing.
 */
export class ControlModeHandler {
  private static _instance: ControlModeHandler | null = null;

  private topic: ROSLIB.Topic | null = null;
  private unsubscribeStatus: (() => void) | null = null;
  private takenCallbacks: Set<ControlTakenCallback> = new Set();
  private controllerChangedCallbacks: Set<ControllerChangedCallback> = new Set();
  private _activeClientId: string = '';

  private constructor() {
    this.unsubscribeStatus = RosBridgeService.getInstance().onStatusChange((status) => {
      if (status === 'connected') {
        this.initTopic();
      } else if (status === 'disconnected') {
        this.topic?.unsubscribe();
        this.topic = null;
        if (this._activeClientId !== '') {
          this._activeClientId = '';
          this.controllerChangedCallbacks.forEach((cb) => cb(''));
        }
      }
    });

    if (RosBridgeService.getInstance().isConnected) {
      this.initTopic();
    }
  }

  static getInstance(): ControlModeHandler {
    if (!ControlModeHandler._instance) {
      ControlModeHandler._instance = new ControlModeHandler();
    }
    return ControlModeHandler._instance;
  }

  get clientId(): string {
    return CLIENT_ID;
  }

  private initTopic() {
    const ros = RosBridgeService.getInstance().rosConnection;
    if (!ros) return;

    this.topic?.unsubscribe();
    this.topic = new ROSLIB.Topic({
      ros,
      name: CONTROL_MODE_TOPIC,
      messageType: 'std_msgs/msg/String',
    });

    this.topic.subscribe((msg: ROSLIB.Message) => {
      const data = (msg as unknown as { data: string }).data ?? '';
      // Non-empty ID from a different client means they took control.
      if (data && data !== CLIENT_ID) {
        this.takenCallbacks.forEach((cb) => cb());
      }
      // Track the active controller and notify listeners on every change.
      if (data !== this._activeClientId) {
        this._activeClientId = data;
        this.controllerChangedCallbacks.forEach((cb) => cb(data));
      }
    });
  }

  /** Claim exclusive control. Notifies all other connected clients to step down. */
  takeControl() {
    this.publish(CLIENT_ID);
  }

  /** Yield control. No forced side-effects on other clients. */
  releaseControl() {
    this.publish('');
  }

  /** Whether any client is currently controlling the robot. */
  get isControlled(): boolean {
    return this._activeClientId !== '';
  }

  /** The raw active-controller ID (empty string = nobody controlling). */
  get currentControllerId(): string {
    return this._activeClientId;
  }

  /**
   * Register a callback fired whenever the active controller changes
   * (including when control is released — activeClientId will be '').
   * Returns a cleanup fn.
   */
  onControllerChanged(cb: ControllerChangedCallback): () => void {
    this.controllerChangedCallbacks.add(cb);
    return () => this.controllerChangedCallbacks.delete(cb);
  }

  /** Register a callback fired when another client claims control. Returns a cleanup fn. */
  onControlTakenByOther(cb: ControlTakenCallback): () => void {
    this.takenCallbacks.add(cb);
    return () => this.takenCallbacks.delete(cb);
  }

  private publish(payload: string) {
    if (!this.topic) return;
    this.topic.publish(new ROSLIB.Message({ data: payload }));
  }

  static cleanup() {
    if (ControlModeHandler._instance) {
      ControlModeHandler._instance.topic?.unsubscribe();
      ControlModeHandler._instance.unsubscribeStatus?.();
      ControlModeHandler._instance = null;
    }
  }
}
