/*
 * Copyright 2025-2026 Sentience Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/** URDF command ↔ actuator calibration (matches ros2_control hardware params). */
export interface JointMapping {
  offsetRad: number;
  direction: number;
  scale: number;
}

/** Per-joint position limits read from the hardware YAML (servo radians). */
export interface JointLimitRad {
  /** Minimum servo angle for this joint (radians). */
  minRad: number;
  /** Maximum servo angle for this joint (radians). */
  maxRad: number;
  /** Default / rest servo angle for this joint (radians). */
  defaultRad: number;
  /** Calibration used to convert slider (servo rad) ↔ trajectory (URDF rad). */
  mapping: JointMapping;
}

export interface ControllerJointConfig {
  /** Command topic for this controller (e.g. /left_arm_controller/joint_trajectory) */
  topic: string;
  /** Joint names in order (must match URDF / ros2_control) */
  joints: string[];
  /** Default category label for these joints in the panel */
  defaultCategory: string;
  /** Per-joint servo limits extracted from the hardware YAML. Keyed by URDF joint name. */
  jointLimits?: Record<string, JointLimitRad>;
  /** Per-joint slider label (actuator id). Keyed by URDF joint name. */
  jointDisplayNames?: Record<string, string>;
}

export const ROS_CONFIG = {
  jointStateTopic: {
    messageType: 'trajectory_msgs/msg/JointTrajectory',
  },
};

/** Topics for `AudioBridgeHandler` (audio_common_msgs AudioStamped-style payloads). */
export const AUDIO_TOPICS = {
  MIC_AUDIO: '/mic_audio',
  AUDIO: '/audio',
  MESSAGE_TYPE: 'audio_common_msgs/msg/AudioStamped',
} as const;

export interface StreamSource {
    id: string;
    name: string;
    topic: string;
    messageType: string;
}

/** Per-sensor stream entry derived from hardware YAML (pressure sensors on `sensors/<scope>` topics). */
export interface SensorSource {
    id: string;
    name: string;
    /** ROS topic for the board's Float32Array payload (e.g. `/sensors/left_arm`). */
    topic: string;
    messageType: string;
    /** Index into the Float32Array for this sensor (board sensors sorted by `virtual_pin`). */
    arrayIndex: number;
    type: string;
    boardId: string;
}

export const SENSOR_FLOAT32_ARRAY_MESSAGE_TYPE = 'ros_gz_interfaces/msg/Float32Array' as const;
