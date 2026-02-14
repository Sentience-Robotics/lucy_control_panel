import ROSLIB from 'roslib';
import { ROS_CONFIG, CONTROLLER_JOINTS_CONFIG, type ControllerJointConfig } from '../../../Constants/rosConfig.ts';
import type { JointControlState } from '../../../Constants/robotTypes.ts';
import { RosBridgeService } from '../ros.service.ts';

/** Builds a map of joint name -> controller config for fast lookup. */
function jointToControllerMap(configs: ControllerJointConfig[]): Map<string, ControllerJointConfig> {
  const m = new Map<string, ControllerJointConfig>();
  for (const c of configs) {
    for (const j of c.joints) {
      m.set(j, c);
    }
  }
  return m;
}

export class JointStateHandler {
  private static instance: JointStateHandler;
  private topicByTopicName: Map<string, ROSLIB.Topic> = new Map();
  private unsubscribeFromStatus: (() => void) | null = null;
  private controllerConfigs: ControllerJointConfig[];
  private jointToController: Map<string, ControllerJointConfig>;

  private constructor(controllerConfigs: ControllerJointConfig[]) {
    this.controllerConfigs = controllerConfigs;
    this.jointToController = jointToControllerMap(controllerConfigs);
    this.unsubscribeFromStatus = RosBridgeService.getInstance().onStatusChange((status) => {
      if (status === 'connected') {
        this.initializeTopics();
      } else if (status === 'disconnected') {
        this.topicByTopicName.forEach((t) => t.unsubscribe());
        this.topicByTopicName.clear();
      }
    });
    this.initializeTopics();
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
    this.jointToController = jointToControllerMap(controllerConfigs);
    this.initializeTopics();
  }

  /** Return current actuated joints as JointControlState[] (from controller config). Used by Configuration page. */
  getJoints(): JointControlState[] {
    const defaultMin = -Math.PI;
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
      JointStateHandler.instance = new JointStateHandler(controllerConfigs ?? CONTROLLER_JOINTS_CONFIG);
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
      const message = new ROSLIB.Message({
        joint_names: names,
        points: [{ positions, time_from_start: { sec: 0, nanosec: 0 } }],
      });
      topic.publish(message);
    }
  }
}
