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
    // URDF file location
    urdfPath: '/InMoov.urdf',

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
     * Resolve relative mesh path from URDF to absolute path
     */
    static resolveUrdfMeshPath(urdfMeshPath: string): string {
        // URDF paths are typically relative like "../meshes/stl/filename.stl"
        // Convert to absolute path for web serving
        if (urdfMeshPath.startsWith('../meshes/')) {
            // Extract the part after "../meshes/"
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
