import ROSLIB from 'roslib';
import { RosBridgeService } from '../ros.service.ts';

const HEARTBEAT_TOPIC = '/lucy/client_heartbeat';
const ACTIVE_CLIENT_TOPIC = '/lucy/active_client';
const CONTROL_SERVICE = '/lucy/control';
const HEARTBEAT_PERIOD_MS = 1000;

// Unique ID for this browser session — stays stable for the page lifetime.
const CLIENT_ID = `cp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

type ControllerChangedCallback = (activeClientId: string) => void;

/**
 * Presence + "who has control" across every client (web, CLI, etc.) via the
 * lucy_client_registry node. See lucy_cli/developer.md for the protocol.
 */
export class ControlModeHandler {
  private static _instance: ControlModeHandler | null = null;

  private activeTopic: ROSLIB.Topic | null = null;
  private heartbeatTopic: ROSLIB.Topic | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private unsubscribeStatus: (() => void) | null = null;
  private controllerChangedCallbacks: Set<ControllerChangedCallback> = new Set();
  private _activeClientId: string = '';

  private constructor() {
    this.unsubscribeStatus = RosBridgeService.getInstance().onStatusChange((status) => {
      if (status === 'connected') {
        this.init();
      } else if (status === 'disconnected') {
        this.teardown();
        if (this._activeClientId !== '') {
          this._activeClientId = '';
          this.controllerChangedCallbacks.forEach((cb) => cb(''));
        }
      }
    });

    if (RosBridgeService.getInstance().isConnected) {
      this.init();
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

  private init() {
    const ros = RosBridgeService.getInstance().rosConnection;
    if (!ros) return;

    this.teardown();

    this.activeTopic = new ROSLIB.Topic({
      ros,
      name: ACTIVE_CLIENT_TOPIC,
      messageType: 'std_msgs/msg/String',
    });
    this.activeTopic.subscribe((msg: ROSLIB.Message) => {
      const data = (msg as unknown as { data: string }).data ?? '';
      // Track the active controller and notify listeners on every change.
      if (data !== this._activeClientId) {
        this._activeClientId = data;
        this.controllerChangedCallbacks.forEach((cb) => cb(data));
      }
    });

    this.heartbeatTopic = new ROSLIB.Topic({
      ros,
      name: HEARTBEAT_TOPIC,
      messageType: 'std_msgs/msg/String',
    });
    const beat = () => this.heartbeatTopic?.publish(new ROSLIB.Message({ data: CLIENT_ID }));
    beat(); // register immediately rather than after the first interval
    this.heartbeatTimer = setInterval(beat, HEARTBEAT_PERIOD_MS);
  }

  private teardown() {
    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.heartbeatTopic = null;
    this.activeTopic?.unsubscribe();
    this.activeTopic = null;
  }

  /** Claim exclusive control. The registry notifies all clients to step down. */
  takeControl() {
    this.callControl(true);
  }

  /** Yield control. No forced side-effects on other clients. */
  releaseControl() {
    this.callControl(false);
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

  private callControl(acquire: boolean) {
    const ros = RosBridgeService.getInstance().rosConnection;
    if (!ros) return;
    const service = new ROSLIB.Service({
      ros,
      name: CONTROL_SERVICE,
      serviceType: 'lucy_msgs/srv/ClientControl',
    });
    // The resulting controller arrives on ACTIVE_CLIENT_TOPIC.
    service.callService(
      new ROSLIB.ServiceRequest({ client_id: CLIENT_ID, acquire }),
      () => {},
      () => {},
    );
  }

  static cleanup() {
    if (ControlModeHandler._instance) {
      ControlModeHandler._instance.teardown();
      ControlModeHandler._instance.unsubscribeStatus?.();
      ControlModeHandler._instance = null;
    }
  }
}
