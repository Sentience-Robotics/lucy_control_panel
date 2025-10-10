import ROSLIB from "roslib";
import { RosBridgeService } from "../ros.service.ts";

export class EnableCameraHandler {
    private static instance: EnableCameraHandler
    private service: ROSLIB.Service | null = null;
    private ros: ROSLIB.Ros | null = null;
    private unsubscribeFromStatus: (() => void) | null = null;

    private constructor() {
        this.unsubscribeFromStatus = RosBridgeService.getInstance().onStatusChange((status) => {
            if (status === 'connected') {
                this.ros = RosBridgeService.getInstance().rosConnection;
                this.service = null;
            } else if (status === 'disconnected') {
                this.ros = null;
                this.service = null;
            }
        });

        this.ros = RosBridgeService.getInstance().rosConnection;
    }
    static getInstance(): EnableCameraHandler {
        if (!EnableCameraHandler.instance) {
            EnableCameraHandler.instance = new EnableCameraHandler();
        }
        return EnableCameraHandler.instance;
    }

    static cleanup(): void {
        if (EnableCameraHandler.instance && EnableCameraHandler.instance.unsubscribeFromStatus) {
            EnableCameraHandler.instance.unsubscribeFromStatus();
        }
    }

    enableCamera(enable: boolean, serviceName: string = '/camera/mobius/enable', serviceType: string = 'std_srvs/srv/SetBool'): Promise<boolean> {
        return new Promise((resolve, reject) => {
                if (!this.ros) {
                    reject(new Error('ROS connection not available'));
                    return;
                }

                if (!this.service) {
                    this.service = new ROSLIB.Service({
                        ros: this.ros,
                        name: serviceName,
                        serviceType: serviceType,
                    });
                }

                const request = new ROSLIB.ServiceRequest({
                    data: enable,
                });
                this.service.callService(request, (result: any) => {
                        if (result.success) {
                            resolve(result.success);
                        }
                        else {
                            reject(new Error('Service call failed'));
                        }
                    }
                    , (error: any) => {
                        reject(error);
                    }
                );
            }
        );
    }
}
