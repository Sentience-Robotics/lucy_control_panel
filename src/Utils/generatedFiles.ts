/**
 * Generated-artifact filenames, mirroring `generated_files` in the hardware
 * mapping YAML (see lucy_config_generator/schema.py `resolve_generated_files`).
 *
 * The robot stack treats `active.yaml` as the single source of truth for these
 * names; the LCP only reads them so user-facing copy matches what the pipeline
 * actually writes. Values are bare filenames — directories are fixed by repo
 * convention (`description/ros2_control/` and `config/`).
 */
export interface GeneratedFileNames {
    ros2ControlXacro: string;
    controllersYaml: string;
}

export const GENERATED_FILE_DEFAULTS: GeneratedFileNames = {
    ros2ControlXacro: 'inmoov_ros2_control.xacro',
    controllersYaml: 'controllers.yaml',
};

function pickBasename(value: unknown, fallback: string): string {
    if (typeof value !== 'string') return fallback;
    const trimmed = value.trim();
    if (!trimmed || trimmed.includes('/') || trimmed.includes('\\')) return fallback;
    return trimmed;
}

/**
 * Resolve the generated filenames from a parsed hardware-config document,
 * falling back to {@link GENERATED_FILE_DEFAULTS} for any missing/invalid key.
 */
export function resolveGeneratedFiles(
    doc: Record<string, unknown> | null | undefined,
): GeneratedFileNames {
    const section =
        doc && typeof doc === 'object'
            ? (doc as { generated_files?: unknown }).generated_files
            : undefined;
    if (!section || typeof section !== 'object') {
        return { ...GENERATED_FILE_DEFAULTS };
    }
    const s = section as { ros2_control_xacro?: unknown; controllers_yaml?: unknown };
    return {
        ros2ControlXacro: pickBasename(s.ros2_control_xacro, GENERATED_FILE_DEFAULTS.ros2ControlXacro),
        controllersYaml: pickBasename(s.controllers_yaml, GENERATED_FILE_DEFAULTS.controllersYaml),
    };
}
