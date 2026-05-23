/** Parsed backend validation line (`lucy_config_pipeline` → `format_error_lines`). */
export interface StructuredValidationLine {
    field: string;
    fieldPath: string[];
    message: string;
    line?: number;
    column?: number;
}

export interface GetConfigResponse {
    success: boolean;
    message: string;
    robot_package: string;
    config_name: string;
    config_yaml: string;
    /** Preset last successfully flashed (from active_meta.yaml); empty if none. */
    flashed_config_name: string;
    /** ISO-8601 UTC from server; empty if none. */
    flashed_at: string;
}

export interface SaveConfigResponse {
    success: boolean;
    message: string;
    validation_errors: string[];
    urdf_warnings: string[];
}

export interface ListConfigsResponse {
    success: boolean;
    message: string;
    active_config: string;
    config_names: string[];
}

export interface ActivateConfigResponse {
    success: boolean;
    message: string;
    backup_name: string;
}

export interface DeleteConfigResponse {
    success: boolean;
    message: string;
}

/** Goal fields mirrored from `lucy_msgs/action/ConfigurePipeline.action`. */
export interface ConfigurePipelineGoalInput {
    robot_package: string;
    /** Named config slot or empty → active YAML on the robot. */
    mapping_file: string;
    /** Empty array → process all boards (`lucy_config_pipeline` semantics). */
    boards_to_flash: string[];
    dry_run: boolean;
    build_only: boolean;
}

export interface ConfigurePipelineFeedbackNormalized {
    phase: string;
    board: string;
    progress: number;
    detail: string;
}

export interface ConfigurePipelineResultNormalized {
    success: boolean;
    message: string;
    config_name: string;
    boards_flashed: string[];
    errors: string[];
}
