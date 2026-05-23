/** ROS `lucy_config_services` — `/config/*` hardware preset lifecycle. */

export type HardwareConfigServiceSuffix = 'get' | 'save' | 'list' | 'activate' | 'delete';

/** ROS 2 action interface string as exposed by rosbridge / roslib. */
export const CONFIGURE_PIPELINE_ACTION_INTERFACE = 'lucy_msgs/action/ConfigurePipeline';
/** Matches `configure_pipeline` endpoint advertised by lucy_config_pipeline. */
export const CONFIGURE_PIPELINE_SERVER_NAME = '/configure_pipeline';

export function hardwareConfigServiceUri(which: HardwareConfigServiceSuffix): string {
    return `/config/${which}`;
}

export const HARDWARE_CONFIG_SERVICE_TYPES = {
    get: 'lucy_msgs/srv/GetConfig',
    save: 'lucy_msgs/srv/SaveConfig',
    list: 'lucy_msgs/srv/ListConfigs',
    activate: 'lucy_msgs/srv/ActivateConfig',
    delete: 'lucy_msgs/srv/DeleteConfig',
} as const;
