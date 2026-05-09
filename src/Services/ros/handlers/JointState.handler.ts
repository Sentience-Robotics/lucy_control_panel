import ROSLIB from 'roslib';
import { ROS_CONFIG, type ControllerJointConfig } from '../../../Constants/rosConfig.ts';
import type { JointControlState } from '../../../Constants/robotTypes.ts';
import { RosBridgeService } from '../ros.service.ts';

/** ROS time (sec + nsec) for trajectory header; from /clock when use_sim_time, else wall clock. */
function getRosTimeNow(rosTime: { sec: number; nanosec: number } | null): { sec: number; nanosec: number } {
  if (rosTime) return rosTime;
  const t = Date.now();
  return { sec: Math.floor(t / 1000), nanosec: (t % 1000) * 1e6 };
}

export class JointStateHandler {
  private static instance: JointStateHandler;
  private topicByTopicName: Map<string, ROSLIB.Topic> = new Map();
  private unsubscribeFromStatus: (() => void) | null = null;
  private clockTopic: ROSLIB.Topic | null = null;
  private lastClock: { sec: number; nanosec: number } | null = null;
  private controllerConfigs: ControllerJointConfig[];

  private constructor(controllerConfigs: ControllerJointConfig[]) {
    this.controllerConfigs = controllerConfigs;
    this.unsubscribeFromStatus = RosBridgeService.getInstance().onStatusChange((status) => {
      if (status === 'connected') {
        this.initializeTopics();
        this.subscribeClock();
      } else if (status === 'disconnected') {
        this.topicByTopicName.forEach((t) => t.unsubscribe());
        this.topicByTopicName.clear();
        if (this.clockTopic) {
          this.clockTopic.unsubscribe();
          this.clockTopic = null;
        }
        this.lastClock = null;
      }
    });
    this.initializeTopics();
    if (RosBridgeService.getInstance().rosConnection) this.subscribeClock();
  }

  private subscribeClock() {
    const ros = RosBridgeService.getInstance().rosConnection;
    if (!ros) return;
    if (this.clockTopic) this.clockTopic.unsubscribe();
    this.clockTopic = new ROSLIB.Topic({
      ros,
      name: '/clock',
      messageType: 'rosgraph_msgs/msg/Clock',
    });
    this.clockTopic.subscribe((msg: ROSLIB.Message) => {
      const clock = (msg as unknown as { clock?: { sec: number; nanosec: number } }).clock;
      if (clock) this.lastClock = clock;
    });
  }

  private initializeTopics() {
    const ros = RosBridgeService.getInstance().rosConnection;
    if (!ros) return;
    this.topicByTopicName.forEach((t) => t.unsubscribe());
    this.topicByTopicName.clear();
    for (const c of this.controllerConfigs) {
      this.topicByTopicName.set(c.topic, new ROSLIB.Topic({
        ros,
        name: c.topic,
        messageType: ROS_CONFIG.jointStateTopic.messageType,
      }));
    }
  }

  /** Update controller config (e.g. after receiving from ROS). */
  setControllerConfigs(controllerConfigs: ControllerJointConfig[]) {
    this.controllerConfigs = controllerConfigs;
    this.initializeTopics();
  }

  /** Return current actuated joints as JointControlState[] (from controller config). Used by Configuration page. */
  getJoints(): JointControlState[] {
    const defaultMin = 0;
    const defaultMax = Math.PI;
    const joints: JointControlState[] = [];
    for (const c of this.controllerConfigs) {
      for (const name of c.joints) {
        joints.push({
          name,
          currentValue: 0,
          targetValue: 0,
          minValue: defaultMin,
          maxValue: defaultMax,
          type: 'revolute',
          category: c.defaultCategory,
        });
      }
    }
    return joints;
  }

  static getInstance(controllerConfigs?: ControllerJointConfig[]): JointStateHandler {
    if (!JointStateHandler.instance) {
      JointStateHandler.instance = new JointStateHandler(controllerConfigs ?? []);
    } else if (controllerConfigs) {
      JointStateHandler.instance.setControllerConfigs(controllerConfigs);
    }
    return JointStateHandler.instance;
  }

  static cleanup(): void {
    if (JointStateHandler.instance) {
      JointStateHandler.instance.topicByTopicName.forEach((t) => t.unsubscribe());
      JointStateHandler.instance.topicByTopicName.clear();
      if (JointStateHandler.instance.unsubscribeFromStatus) {
        JointStateHandler.instance.unsubscribeFromStatus();
      }
    }
  }

  /**
   * Publish current joint positions to ros2_control.
   * Groups joints by controller and publishes one JointTrajectory per controller.
   * Joint order and names follow controller config (required by JointTrajectoryController).
   * Positions are in radians.
   * Uses a small non-zero time_from_start (0.2s) so the controller accepts the goal (some drop points with t=0).
   */
  publishJointStates(joints: JointControlState[]) {
    const ros = RosBridgeService.getInstance().rosConnection;
    if (!ros) {
      console.warn('Cannot publish joint states: ROS connection not available');
      return;
    }
    this.initializeTopics();

    const jointByName = new Map<string, JointControlState>();
    for (const j of joints) {
      jointByName.set(j.name, j);
    }

    for (const cfg of this.controllerConfigs) {
      const names: string[] = [];
      const positions: number[] = [];
      for (const name of cfg.joints) {
        const j = jointByName.get(name);
        if (j == null) continue;
        names.push(name);
        positions.push(j.currentValue);
      }
      if (names.length === 0) continue;
      const topic = this.topicByTopicName.get(cfg.topic);
      if (!topic) continue;
      const stamp = getRosTimeNow(this.lastClock);
      const message = new ROSLIB.Message({
        header: { stamp, frame_id: '' },
        joint_names: names,
        points: [{ positions, time_from_start: { sec: 0, nanosec: 200000000 } }],
      });
      topic.publish(message);
    }
  }
}
