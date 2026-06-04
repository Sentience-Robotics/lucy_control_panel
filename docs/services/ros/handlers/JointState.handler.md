# JointStateHandler

**File:** `src/Services/ros/handlers/JointState.handler.ts`

Singleton responsible for publishing joint commands to `ros2_control` via ROS Bridge.
It groups joints by controller and sends one `trajectory_msgs/JointTrajectory` message
per controller on every call to `publishJointStates()`.

---

## Purpose

- Maintain one `ROSLIB.Topic` publisher per `ros2_control` controller topic.
- React to ROS Bridge connection/disconnection: initialize or tear down topics automatically.
- Track the `/clock` topic so trajectory headers use simulation time when `use_sim_time` is active.
- Expose `getJoints()` so the UI can bootstrap its joint list from controller config alone (before any URDF is parsed).

---

## API

### `getInstance(controllerConfigs?): JointStateHandler`

Returns (or lazily creates) the singleton instance.

| Parameter | Type | Description |
|---|---|---|
| `controllerConfigs` | `ControllerJointConfig[]` (optional) | Overrides the active controller config. On first `getInstance()` call with no argument, uses `[]` (no trajectory topics until configs are passed). |

```typescript
const handler = JointStateHandler.getInstance();
```

---

### `publishJointStates(joints: JointControlState[]): void`

Publishes the current joint positions to `ros2_control`.

- Iterates over `controllerConfigs`; for each controller, collects only the joints that belong to it (by name).
- Publishes one `trajectory_msgs/JointTrajectory` per controller with a single waypoint.
- Uses `time_from_start = 0.2 s` — some controllers reject points with `t = 0`.
- Positions are in **URDF radians**. Sliders work in actuators degrees or radians; conversion happens at the page layer (`servoDegToJointRad` / `jointRadToServoDeg`) before reaching this handler. URDF clamping is enforced downstream by `LucySystemHardware`, not in the LCP.
- Silently skips joints not present in the `joints` array.

```typescript
handler.publishJointStates(currentJoints);
```

**ROS message structure published:**

```
trajectory_msgs/JointTrajectory
  header:
    stamp: { sec, nanosec }   ← from /clock if sim, else wall clock
    frame_id: ''
  joint_names: string[]       ← joints belonging to this controller
  points:
    - positions: number[]     ← radians, same order as joint_names
      time_from_start: { sec: 0, nanosec: 200_000_000 }
```

---

### `getJoints(): JointControlState[]`

Returns a `JointControlState[]` bootstrapped from the controller config,
with `currentValue = targetValue = 0` and default range `[0, π]`.

Used by the Configuration page before URDF limits are available.

---

### `setControllerConfigs(configs: ControllerJointConfig[]): void`

Replaces the active controller config and re-initialises the topic map.
Called when a live config is received from ROS (e.g. after introspection).

---

### `cleanup(): void` *(static)*

Unsubscribes all topics and the status listener. Call on component unmount or app shutdown.

```typescript
JointStateHandler.cleanup();
```

---

## Data flow

```
RosBridgeService (status: 'connected')
  → initializeTopics()     creates one ROSLIB.Topic per controller
  → subscribeClock()       subscribes to /clock

publishJointStates(joints)
  → groups joints by controller
  → builds JointTrajectory message (sim or wall clock stamp)
  → topic.publish(message)
    → ROS Bridge WebSocket
      → ros2_control JointTrajectoryController
```

---

## Dependencies

| Import | Role |
|---|---|
| `ROSLIB` | WebSocket/topic primitives |
| `RosBridgeService` | Provides the active `ros` connection and status events |
| `ControllerJointConfig` (type) | Controller topic + joint names + category (from `rosConfig.ts`) |
| `JointControlState` | Joint value shape from `robotTypes.ts` |

---

## Design notes

- **Singleton pattern** — avoids duplicate topic publishers when the handler is accessed from multiple components.
- **Clock subscription** — `trajectory_msgs` headers must carry simulation time when `use_sim_time:=true`; falling back to wall clock transparently supports the real-robot case.
- **Joint ordering** — `JointTrajectoryController` requires positions in the same order as `joint_names` in the YAML config. The handler enforces this by iterating `cfg.joints` (from config), not the incoming `joints` array.
- **`time_from_start = 0.2 s`** — a known workaround: some versions of `ros2_control`'s `JointTrajectoryController` silently drop the first point when its timestamp is exactly zero.
