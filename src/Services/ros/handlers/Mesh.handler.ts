import ROSLIB from 'roslib';
import { RosBridgeService } from '../ros.service.ts';

/**
 * Fetches a mesh referenced by the URDF over the `mesh/get` service on the
 * `lucy_config_services` node, which reads the file (e.g. Collada/DAE XML) on
 * the robot host and returns its text. Lets the 3D viewer load geometry without
 * any filesystem access of its own.
 */
const MESH_SERVICE_NAME = '/mesh/get';
const MESH_SERVICE_TYPE = 'lucy_msgs/srv/GetMesh';
const MESH_SERVICE_TIMEOUT_MS = 30_000;

export class MeshHandler {
    /** Resolve to the mesh file's text, or reject on failure/timeout. */
    static getMesh(path: string): Promise<string> {
        const ros = RosBridgeService.getInstance().rosConnection;
        if (!ros) return Promise.reject(new Error('ROS bridge is not connected.'));

        const svc = new ROSLIB.Service({
            ros,
            name: MESH_SERVICE_NAME,
            serviceType: MESH_SERVICE_TYPE,
        });
        const req = new ROSLIB.ServiceRequest({ path });

        return new Promise<string>((resolve, reject) => {
            const timer = window.setTimeout(
                () => reject(new Error(`${MESH_SERVICE_NAME} timed out for ${path}`)),
                MESH_SERVICE_TIMEOUT_MS,
            );
            svc.callService(
                req,
                (result: { success?: boolean; message?: string; data?: string }) => {
                    window.clearTimeout(timer);
                    if (result?.success && typeof result.data === 'string') {
                        resolve(result.data);
                    } else {
                        reject(new Error(result?.message || `${MESH_SERVICE_NAME} failed for ${path}`));
                    }
                },
                (error: string) => {
                    window.clearTimeout(timer);
                    reject(new Error(error));
                },
            );
        });
    }
}
