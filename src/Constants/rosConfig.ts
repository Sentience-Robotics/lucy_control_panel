/** URDF command ↔ actuator calibration (matches ros2_control hardware params). */
export interface JointMapping {
  offsetDeg: number;
  direction: number;
  scale: number;
}

/** Per-joint position limits read from the hardware YAML (actuator degrees). */
export interface JointLimitDeg {
  /** Minimum actuator angle for this joint (degrees). */
  minDeg: number;
  /** Maximum actuator angle for this joint (degrees). */
  maxDeg: number;
  /** Default / rest actuator angle for this joint (degrees). */
  defaultDeg: number;
  /** Calibration used to convert slider (actuator deg) ↔ trajectory (URDF rad). */
  mapping: JointMapping;
}

export interface ControllerJointConfig {
  /** Command topic for this controller (e.g. /left_arm_controller/joint_trajectory) */
  topic: string;
  /** Joint names in order (must match URDF / ros2_control) */
  joints: string[];
  /** Default category label for these joints in the panel */
  defaultCategory: string;
  /** Per-joint actuator limits extracted from the hardware YAML. Keyed by URDF joint name. */
  jointLimits?: Record<string, JointLimitDeg>;
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
    /** True for virtual sources that render a custom component instead of a ROS image topic. */
    virtual?: boolean;
}

export const STREAM_SOURCE_3D_VIEW: StreamSource = {
    id: '3d-view',
    name: '3D View',
    topic: '',
    messageType: '',
    virtual: true,
};

/** Initial placeholder until a camera from the active config is selected. */
export const DEFAULT_STREAM_SOURCE = STREAM_SOURCE_3D_VIEW;
