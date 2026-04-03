# Lucy Control Panel — Documentation

Technical reference for the Lucy Control Panel frontend application.

## Structure

```
docs/
├── architecture/
│   └── overview.md              High-level module map and data-flow
├── services/
│   ├── ros/
│   │   ├── ros.service.md       RosBridgeService (WebSocket lifecycle)
│   │   └── handlers/
│   │       ├── JointState.handler.md
│   │       ├── Camera.handler.md
│   │       └── ConnectedClients.handler.md
│   ├── storage.service.md
│   └── axiosClient.service.md
├── constants/
│   ├── rosConfig.md
│   ├── robotTypes.md
│   └── robotConfig.md
├── hooks/
│   └── useRosConnection.md
├── components/
│   └── README.md
└── pages/
    └── README.md
```

## Conventions

- Each module doc follows the template: **Purpose → API → Data flow → Dependencies → Notes**.
- Code snippets use TypeScript.
- ROS topic names and message types are written in `monospace`.
