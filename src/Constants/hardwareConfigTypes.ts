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
    config_name: string;
    config_yaml: string;
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
