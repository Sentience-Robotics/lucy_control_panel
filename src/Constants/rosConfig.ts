export const ROS_CONFIG = {
    jointStateTopic: {
        name: '/joints/right_arm',
        messageType: 'sensor_msgs/JointState'
    }
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

/** Audio I/O for control-panel-as-mic/speakers (see lucy_ros_api docs/CONTROL_PANEL_AUDIO.md) */
export const AUDIO_TOPICS = {
    MIC_AUDIO: '/mic_audio',
    AUDIO: '/audio',
    MESSAGE_TYPE: 'audio_common_msgs/msg/AudioStamped',
} as const;
