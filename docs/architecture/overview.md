# Architecture Overview

> TODO: Add a high-level diagram (Mermaid or image) of the module map and data-flow between Pages, Components, Services, and ROS.

## Module map

```
src/
├── Pages/          Route-level views (React components)
├── Components/     Shared UI components
├── Services/
│   ├── ros/        ROS Bridge communication layer
│   │   ├── ros.service.ts          WebSocket lifecycle singleton
│   │   └── handlers/               Topic-specific publish/subscribe logic
│   ├── storage.service.ts          LocalStorage persistence
│   └── axiosClient.service.ts      HTTP client (REST endpoints)
├── Constants/      Static config (ROS topics, joint mappings, types)
├── hooks/          Custom React hooks
└── Utils/          Pure helpers (math, logger)
```

## Data flow (joint control)

```
User slider (JointControl component)
  → RobotControlPanel (state)
    → JointStateHandler.publishJointStates()
      → ROSLIB.Topic.publish()   [trajectory_msgs/JointTrajectory]
        → ROS Bridge (WebSocket)
          → ros2_control (controller_manager)
            → Hardware / Gazebo
```
