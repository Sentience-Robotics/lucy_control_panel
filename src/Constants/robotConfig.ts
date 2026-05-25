/**
 * Robot Configuration File
 * Centralized configuration for URDF and mesh file paths
 */

export interface RobotConfig {
    // URDF file path
    urdfPath: string;

    // Base path for meshes directory
    meshBasePath: string;

    // Specific mesh subdirectories
    meshPaths: {
        stl: string;
        obj?: string;
        dae?: string;
    };

    // Full mesh paths (computed)
    fullMeshPaths: {
        stl: string;
        obj?: string;
        dae?: string;
    };
}

export const ROBOT_CONFIG: RobotConfig = {
    // URDF file location — served by the dev server from ROBOT_URDF_PATH in .env
    urdfPath: '/robot.urdf',

    // Base mesh directory
    meshBasePath: '/meshes',

    // Mesh subdirectories
    meshPaths: {
        stl: 'stl',
        obj: 'obj',
        dae: 'dae',
    },

    // Computed full paths
    get fullMeshPaths() {
        return {
            stl: `${this.meshBasePath}/${this.meshPaths.stl}`,
            obj: this.meshPaths.obj ? `${this.meshBasePath}/${this.meshPaths.obj}` : undefined,
            dae: this.meshPaths.dae ? `${this.meshBasePath}/${this.meshPaths.dae}` : undefined,
        };
    }
};

// Helper functions for path resolution
export class RobotPathResolver {

    /**
     * Get the full URDF file path
     */
    static getUrdfPath(): string {
        return ROBOT_CONFIG.urdfPath;
    }

    /**
     * Get the full mesh directory path
     */
    static getMeshBasePath(): string {
        return ROBOT_CONFIG.meshBasePath;
    }

    /**
     * Get specific mesh format path
     */
    static getMeshPath(format: keyof typeof ROBOT_CONFIG.meshPaths): string {
        const path = ROBOT_CONFIG.fullMeshPaths[format];
        if (!path) {
            throw new Error(`Mesh format "${format}" is not configured`);
        }
        return path;
    }

    /**
     * Get full path to a specific mesh file
     */
    static getFullMeshFilePath(filename: string, format: keyof typeof ROBOT_CONFIG.meshPaths = 'stl'): string {
        const basePath = this.getMeshPath(format);
        return `${basePath}/${filename}`;
    }

    /**
     * Resolve a URDF mesh filename to a browser-fetchable URL.
     *
     * Handles three path formats emitted by different URDF/xacro pipelines:
     *  - `file:///abs/path/to/meshes/dae/foo.dae`  — compiled xacro with file:// scheme
     *  - `package://pkg_name/meshes/dae/foo.dae`    — ROS package:// convention
     *  - `../meshes/stl/foo.stl`                    — relative path (older style)
     *
     * In all cases the dev server middleware maps `/meshes/*` → ROBOT_MESHES_PATH/* (set in .env).
     */
    static resolveUrdfMeshPath(urdfMeshPath: string): string {
        // file:// absolute path — strip scheme, find "/meshes/" and keep from there
        if (urdfMeshPath.startsWith('file://')) {
            const fsPath = urdfMeshPath.replace(/^file:\/\//, '');
            const idx = fsPath.indexOf('/meshes/');
            if (idx !== -1) return fsPath.slice(idx); // → /meshes/dae/filename.dae
            // Fallback: just serve by filename from the meshes root
            const filename = fsPath.split('/').pop() ?? '';
            return `${ROBOT_CONFIG.meshBasePath}/${filename}`;
        }

        // package:// ROS convention — strip scheme + package name, map "meshes/…" → /meshes/…
        if (urdfMeshPath.startsWith('package://')) {
            const withoutScheme = urdfMeshPath.replace(/^package:\/\/[^/]+\//, '');
            const idx = withoutScheme.indexOf('meshes/');
            if (idx !== -1) {
                return `${ROBOT_CONFIG.meshBasePath}/${withoutScheme.slice(idx + 'meshes/'.length)}`;
            }
            return `${ROBOT_CONFIG.meshBasePath}/${withoutScheme.split('/').pop()}`;
        }

        // Relative path like "../meshes/stl/filename.stl"
        if (urdfMeshPath.startsWith('../meshes/')) {
            const relativePath = urdfMeshPath.replace('../meshes/', '');
            return `${ROBOT_CONFIG.meshBasePath}/${relativePath}`;
        }

        return urdfMeshPath;
    }

    /**
     * Get all configured mesh paths
     */
    static getAllMeshPaths(): Record<string, string> {
        return Object.entries(ROBOT_CONFIG.fullMeshPaths)
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            .filter(([_, path]) => path !== undefined)
            .reduce((acc, [format, path]) => {
                acc[format] = path!;
                return acc;
            }, {} as Record<string, string>);
    }
}

// Export commonly used paths as constants for convenience
export const URDF_PATH = ROBOT_CONFIG.urdfPath;
export const MESH_BASE_PATH = ROBOT_CONFIG.meshBasePath;
export const STL_MESH_PATH = ROBOT_CONFIG.fullMeshPaths.stl;

export const DEV_CONFIG = {
    enablePathLogging: import.meta.env.DEV,

    logResolvedPath: (originalPath: string, resolvedPath: string) => {
        if (DEV_CONFIG.enablePathLogging) {
            console.log(`[RobotConfig] Resolved path: ${originalPath} -> ${resolvedPath}`);
        }
    }
};
