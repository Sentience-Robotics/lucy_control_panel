/**
 * ROS transport only: hardware YAML validation and URDF cross-checks run on the
 * `lucy_config_services` node (`config/get`, `config/save`). The frontend displays
 * returned `message` / `validation_errors` / `urdf_warnings` without rewriting server text.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import ROSLIB from 'roslib';
import {
    HARDWARE_CONFIG_SERVICE_TYPES,
    hardwareConfigServiceUri,
} from '../../../Constants/hardwareConfigRos.ts';
import type {
    ActivateConfigResponse,
    DeleteConfigResponse,
    GetConfigResponse,
    ListConfigsResponse,
    SaveConfigResponse,
} from '../../../Constants/hardwareConfigTypes.ts';
import { RosBridgeService } from '../ros.service.ts';

const SERVICE_TIMEOUT_MS = 45_000;

function getRos(): ROSLIB.Ros | null {
    return RosBridgeService.getInstance().rosConnection;
}

function callService<TReq extends Record<string, unknown>, TRes>(
    name: string,
    serviceType: string,
    request: TReq,
): Promise<TRes> {
    const ros = getRos();
    if (!ros) {
        return Promise.reject(new Error('ROS bridge is not connected.'));
    }
    const svc = new ROSLIB.Service({
        ros,
        name,
        serviceType,
    });
    const req = new ROSLIB.ServiceRequest(request as unknown as ROSLIB.Message);
    return new Promise<TRes>((resolve, reject) => {
        const timer = window.setTimeout(() => {
            reject(new Error(`Service ${name} timed out after ${SERVICE_TIMEOUT_MS}ms`));
        }, SERVICE_TIMEOUT_MS);
        svc.callService(req, (result: TRes) => {
            window.clearTimeout(timer);
            resolve(result);
        });
    });
}

function normalizeGetConfig(raw: any): GetConfigResponse {
    const success = Boolean(raw?.success);
    return {
        success,
        message: typeof raw?.message === 'string' ? raw.message : '',
        config_name: typeof raw?.config_name === 'string' ? raw.config_name : '',
        config_yaml: typeof raw?.config_yaml === 'string' ? raw.config_yaml : '',
    };
}

function normalizeSaveConfig(raw: any): SaveConfigResponse {
    const validation_errors = Array.isArray(raw?.validation_errors)
        ? raw.validation_errors.filter((x: unknown) => typeof x === 'string')
        : [];
    const urdf_warnings = Array.isArray(raw?.urdf_warnings)
        ? raw.urdf_warnings.filter((x: unknown) => typeof x === 'string')
        : [];
    return {
        success: Boolean(raw?.success),
        message: typeof raw?.message === 'string' ? raw.message : '',
        validation_errors,
        urdf_warnings,
    };
}

function normalizeListConfigs(raw: any): ListConfigsResponse {
    const config_names = Array.isArray(raw?.config_names)
        ? raw.config_names.filter((x: unknown) => typeof x === 'string')
        : [];
    return {
        success: Boolean(raw?.success),
        message: typeof raw?.message === 'string' ? raw.message : '',
        active_config: typeof raw?.active_config === 'string' ? raw.active_config : '',
        config_names,
    };
}

function normalizeActivateConfig(raw: any): ActivateConfigResponse {
    return {
        success: Boolean(raw?.success),
        message: typeof raw?.message === 'string' ? raw.message : '',
        backup_name: typeof raw?.backup_name === 'string' ? raw.backup_name : '',
    };
}

function normalizeDeleteConfig(raw: any): DeleteConfigResponse {
    return {
        success: Boolean(raw?.success),
        message: typeof raw?.message === 'string' ? raw.message : '',
    };
}

export class HardwareConfigHandler {
    static async getConfig(configName: string): Promise<GetConfigResponse> {
        const raw = await callService(
            hardwareConfigServiceUri('get'),
            HARDWARE_CONFIG_SERVICE_TYPES.get,
            {
                robot_package: '',
                config_name: configName,
            },
        );
        return normalizeGetConfig(raw);
    }

    static async saveConfig(
        configName: string,
        configYaml: string,
        activate: boolean,
    ): Promise<SaveConfigResponse> {
        const raw = await callService(
            hardwareConfigServiceUri('save'),
            HARDWARE_CONFIG_SERVICE_TYPES.save,
            {
                robot_package: '',
                config_name: configName,
                config_yaml: configYaml,
                activate,
            },
        );
        return normalizeSaveConfig(raw);
    }

    static async listConfigs(): Promise<ListConfigsResponse> {
        const raw = await callService(
            hardwareConfigServiceUri('list'),
            HARDWARE_CONFIG_SERVICE_TYPES.list,
            { robot_package: '' },
        );
        return normalizeListConfigs(raw);
    }

    static async activateConfig(configName: string): Promise<ActivateConfigResponse> {
        const raw = await callService(
            hardwareConfigServiceUri('activate'),
            HARDWARE_CONFIG_SERVICE_TYPES.activate,
            {
                robot_package: '',
                config_name: configName,
            },
        );
        return normalizeActivateConfig(raw);
    }

    static async deleteConfig(configName: string): Promise<DeleteConfigResponse> {
        const raw = await callService(
            hardwareConfigServiceUri('delete'),
            HARDWARE_CONFIG_SERVICE_TYPES.delete,
            {
                robot_package: '',
                config_name: configName,
            },
        );
        return normalizeDeleteConfig(raw);
    }
}
