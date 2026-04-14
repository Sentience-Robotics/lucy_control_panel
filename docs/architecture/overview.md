# Architecture Overview

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

---

## System diagram

```mermaid
flowchart TD
    subgraph Browser["🌐 Browser"]
        subgraph React["React Application"]
            Pages["Pages\n(RobotControlPanel, Robot3DViewer,\nConfiguration, Stream)"]
            Components["Components\n(JointControl, PoseManager,\nStreamPlayer, ...)"]
            Hooks["useRosConnection"]
            Storage["StorageService\n(LocalStorage)"]

            Pages -->|"renders"| Components
            Pages -->|"reads status"| Hooks
            Pages -->|"save / load poses"| Storage
        end

        Hooks -->|"connect / disconnect"| RosBridge
        Pages -->|"publishJointStates()"| JSH
        Pages -->|"subscribe()"| CamH
        Pages -->|"subscribe()"| CCH

        subgraph Services["Services / ROS layer"]
            RosBridge["RosBridgeService\n(WebSocket singleton)"]
            JSH["JointStateHandler"]
            CamH["CameraHandler"]
            CCH["ConnectedClientsHandler"]
        end

        JSH -->|"uses"| RosBridge
        CamH -->|"uses"| RosBridge
        CCH -->|"uses"| RosBridge
    end

    subgraph ROS["🤖 ROS 2 (robot / Gazebo)"]
        ROSBridgeServer["rosbridge_server\n(WebSocket)"]
        ControllerManager["controller_manager\n(ros2_control)"]
        ClockTopic["/clock"]
        CameraTopic["camera topic"]
        Hardware["Hardware / Gazebo"]
    end

    RosBridge <-->|"ws:// or wss://"| ROSBridgeServer
    JSH -->|"trajectory_msgs/JointTrajectory"| ROSBridgeServer
    ROSBridgeServer --> ControllerManager --> Hardware
    ClockTopic -->|"rosgraph_msgs/Clock"| JSH
    CameraTopic -->|"sensor_msgs/Image"| CamH

    %% ── React Application nodes ──────────────────────────────
    style Pages      fill:#1e3a5f,stroke:#4a9eff,stroke-width:2px,color:#e8f4ff
    style Components fill:#1e3a5f,stroke:#4a9eff,stroke-width:2px,color:#e8f4ff
    style Hooks      fill:#1e3a5f,stroke:#4a9eff,stroke-width:2px,color:#e8f4ff
    style Storage    fill:#2a2a4a,stroke:#7070cc,stroke-width:2px,color:#d0d0ff

    %% ── Service layer nodes ──────────────────────────────────
    style RosBridge  fill:#0d3d2e,stroke:#00c97a,stroke-width:2px,color:#ccffe8
    style JSH        fill:#0d3d2e,stroke:#00c97a,stroke-width:2px,color:#ccffe8
    style CamH       fill:#0d3d2e,stroke:#00c97a,stroke-width:2px,color:#ccffe8
    style CCH        fill:#0d3d2e,stroke:#00c97a,stroke-width:2px,color:#ccffe8

    %% ── ROS 2 nodes ──────────────────────────────────────────
    style ROSBridgeServer   fill:#3d1f00,stroke:#ff8c00,stroke-width:2px,color:#ffe0b2
    style ControllerManager fill:#3d1f00,stroke:#ff8c00,stroke-width:2px,color:#ffe0b2
    style Hardware          fill:#3d1f00,stroke:#ff8c00,stroke-width:2px,color:#ffe0b2
    style ClockTopic        fill:#2a1a00,stroke:#cc6600,stroke-width:1px,color:#ffd080
    style CameraTopic       fill:#2a1a00,stroke:#cc6600,stroke-width:1px,color:#ffd080

    %% ── Subgraph backgrounds ─────────────────────────────────
    style React     fill:#0a1628,stroke:#4a9eff,stroke-width:2px,color:#ffffff
    style Services  fill:#051a12,stroke:#00c97a,stroke-width:2px,color:#ffffff
    style Browser   fill:#0d0d1a,stroke:#555599,stroke-width:2px,color:#aaaacc
    style ROS       fill:#1a0d00,stroke:#ff8c00,stroke-width:2px,color:#ffcc88
```

---

## Joint control data flow

```mermaid
sequenceDiagram
    actor User
    participant Slider as JointControl (slider)
    participant Panel as RobotControlPanel
    participant JSH as JointStateHandler
    participant WS as RosBridgeService (WebSocket)
    participant ROS as ros2_control

    User->>Slider: moves slider
    Slider->>Panel: onJointChange(name, value)
    Panel->>JSH: publishJointStates(joints)
    JSH->>JSH: group joints by controller
    JSH->>WS: topic.publish(JointTrajectory)
    WS->>ROS: trajectory_msgs/JointTrajectory\n[names, positions (rad), t=0.2 s]
    ROS-->>Hardware: drive servos
```
