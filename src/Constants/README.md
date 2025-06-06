# Robot Configuration

This directory contains configuration files for the robot system.

## `robotConfig.ts`

Centralized configuration for URDF and mesh file paths. This file allows you to:

1. **Configure file paths** for URDF and mesh files in one place
2. **Easily change paths** without searching through the codebase
3. **Support multiple mesh formats** (STL, OBJ, DAE)
4. **Resolve relative paths** from URDF files to absolute web paths

### Usage Examples

```typescript
import { RobotPathResolver, URDF_PATH, STL_MESH_PATH } from './robotConfig';

// Get URDF file path
const urdfPath = RobotPathResolver.getUrdfPath();
// Result: '/InMoov.urdf'

// Get mesh directory path
const meshPath = RobotPathResolver.getMeshPath('stl');
// Result: '/meshes/stl'

// Get full path to a specific mesh file
const fullMeshPath = RobotPathResolver.getFullMeshFilePath('hand.stl');
// Result: '/meshes/stl/hand.stl'

// Resolve URDF relative paths to absolute paths
const absolutePath = RobotPathResolver.resolveUrdfMeshPath('../meshes/stl/part.stl');
// Result: '/meshes/stl/part.stl'

// Use convenience constants
fetch(URDF_PATH); // Fetch the URDF file
```

### Configuration Structure

```typescript
export const ROBOT_CONFIG = {
    urdfPath: '/InMoov.urdf',           // URDF file location
    meshBasePath: '/meshes',            // Base mesh directory
    meshPaths: {
        stl: 'stl',                     // STL files subdirectory
        obj: 'obj',                     // OBJ files subdirectory
        dae: 'dae',                     // DAE files subdirectory
    }
};
```

### Benefits

- **Single source of truth** for all file paths
- **Easy maintenance** - change paths in one place
- **Type safety** with TypeScript interfaces
- **Development helpers** for debugging path resolution
- **Extensible** for future file formats or path structures

### Files Updated

The following files have been updated to use this configuration:

- `src/Pages/RobotControlPanel.tsx` - URDF loading
- `src/Pages/Robot3DViewer.tsx` - URDF and mesh loading

### Adding New Mesh Formats

To support a new mesh format:

1. Add the format to `meshPaths` in `ROBOT_CONFIG`
2. Update the `RobotConfig` interface if needed
3. Use `RobotPathResolver.getMeshPath('newformat')` in your code