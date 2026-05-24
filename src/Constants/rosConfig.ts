/** Per-joint position limits read from the hardware YAML (servo degrees). */
export interface JointLimitDeg {
  /** Minimum servo angle for this joint (degrees). */
  minDeg: number;
  /** Maximum servo angle for this joint (degrees). */
  maxDeg: number;
  /** Default / rest servo angle for this joint (degrees). */
  defaultDeg: number;
}

export interface ControllerJointConfig {
  /** Command topic for this controller (e.g. /left_arm_controller/joint_trajectory) */
  topic: string;
  /** Joint names in order (must match URDF / ros2_control) */
  joints: string[];
  /** Default category label for these joints in the panel */
  defaultCategory: string;
  /** Per-joint servo limits extracted from the hardware YAML. Keyed by URDF joint name. */
  jointLimits?: Record<string, JointLimitDeg>;
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

export const STREAM_SOURCES: StreamSource[] = [
    {
        id: 'ext-camera',
        name: 'External USB Webcam',
        topic: '/ext_camera/jpg',
        messageType: 'sensor_msgs/msg/CompressedImage'
    },
    {
        id: 'gazebo',
        name: 'Gazebo Webcam',
        topic: '/camera/gazebo/compressed',
        messageType: 'sensor_msgs/msg/CompressedImage'
    },
    {
        id: 'realsense-rgb',
        name: 'Realsense RGB',
        topic: '/realsense/realsense2_camera/color/image_raw/compressed',
        messageType: 'sensor_msgs/msg/CompressedImage'
    },
    {
        id: 'realsense-aligned-depth',
        name: 'Realsense Aligned Depth',
        topic: '/realsense/realsense2_camera/aligned_depth_to_color/image_raw/compressed',
        messageType: 'sensor_msgs/msg/CompressedImage'
    }
];

export const DEFAULT_STREAM_SOURCE = STREAM_SOURCES[0];
