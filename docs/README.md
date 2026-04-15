# Lucy Control Panel — Documentation

Technical reference for the Lucy Control Panel frontend application.

---

## Navigation

### [Architecture](./architecture/overview.md)
High-level module map and data-flow diagram across the full stack.

### Services

| Document | Description |
|---|---|
| [RosBridgeService](./services/ros/ros.service.md) | WebSocket connection lifecycle, status events, reconnection |
| [JointStateHandler](./services/ros/handlers/JointState.handler.md) | Joint command publication via `trajectory_msgs/JointTrajectory` |

### [Components](./components/README.md)
Shared UI components reference table.

### [Pages](./pages/README.md)
Route-level views and their responsibilities.

---

## Conventions

- Each module doc follows the template: **Purpose → API → Data flow → Dependencies → Notes**.
- Code snippets use TypeScript.
- ROS topic names and message types are written in `monospace`.
