/**
 * ROS config: controller command topics and joint names.
 * Must match ros2_control config (e.g. lucy_controllers.yaml).
 * The panel can optionally subscribe to CONTROLLER_JOINTS_TOPIC to receive
 * controller->joints from ROS and use that instead of this static config.
 */
export interface ControllerJointConfig {
  /** Command topic for this controller (e.g. /left_arm_controller/joint_trajectory) */
  topic: string;
  /** Joint names in order (must match URDF / ros2_control) */
  joints: string[];
  /** Default category label for these joints in the panel */
  defaultCategory: string;
}

/** Static config: keep in sync with lucy_controllers.yaml (or your ros2_control config). */
export const CONTROLLER_JOINTS_CONFIG: ControllerJointConfig[] = [
  {
    topic: '/left_arm_controller/joint_trajectory',
    joints: [
      'left_shoulder_y_link_joint',
      'left_shoulder_z_link_joint',
      'left_shoulder_x_link_joint',
      'left_elbow_x_link_joint',
      'left_wrist_z_link_joint',
      'i01.leftHand.thumb_link_joint',
      'i01.leftHand.index_link_joint',
      'i01.leftHand.majeure_link_joint',
      'i01.leftHand.ringFinger_link_joint',
      'i01.leftHand.pinky_link_joint',
    ],
    defaultCategory: 'Left Arm',
  },
  {
    topic: '/right_arm_controller/joint_trajectory',
    joints: [
      'right_shoulder_y_link_joint',
      'right_shoulder_z_link_joint',
      'right_shoulder_x_link_joint',
      'right_elbow',
      'right_wrist_z_link_joint',
      'i01.rightHand.thumb_link_joint',
      'i01.rightHand.index_link_joint',
      'i01.rightHand.majeure_link_joint',
      'i01.rightHand.ringFinger_link_joint',
      'i01.rightHand.pinky_link_joint',
    ],
    defaultCategory: 'Right Arm',
  },
];

/** Topic to subscribe to for dynamic controller/joints from ROS (std_msgs/String JSON). Message format: { "controllers": ControllerJointConfig[] }. */
export const CONTROLLER_JOINTS_TOPIC = '/lucy_control_panel/controller_joints';
export const CONTROLLER_JOINTS_MESSAGE_TYPE = 'std_msgs/msg/String';

export const ROS_CONFIG = {
  jointStateTopic: {
    messageType: 'trajectory_msgs/msg/JointTrajectory',
  },
};

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
