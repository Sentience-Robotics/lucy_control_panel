# Constants

Shared configuration and type definitions for the control panel
(`rosConfig`, `robotTypes`, `hardwareConfigRos`, `uiTheme`, …).

## Robot model loading

The 3D viewer loads the robot entirely over ROS — no file paths are configured:

- **URDF** — the latched `/robot_description` topic
  (`Services/ros/handlers/RobotDescription.handler.ts`).
- **Meshes** — the `mesh/get` service on `lucy_config_services`
  (`Services/ros/handlers/Mesh.handler.ts`), parsed in `useRobotModel`'s
  custom `loadMeshCb`.
