/**
 * Loads the robot model via urdf-loader (full FK, DAE/STL loading, visual origins
 * and joint transforms).
 *
 * Both the model and its meshes come over ROS, so the viewer needs no
 * filesystem access:
 *  - the URDF XML from the latched `/robot_description` topic (RobotDescriptionHandler);
 *  - each `<mesh>` from the `mesh/get` service (MeshHandler), parsed in a custom
 *    `loadMeshCb` rather than fetched as a URL.
 *
 * Module-level cache: once loaded in a browser session, subsequent mounts
 * (e.g. closing/reopening the stream modal) reuse the parsed data instantly.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { isWebGLAvailable, ColladaLoader, STLLoader } from 'three-stdlib';
import URDFLoader from 'urdf-loader';
import type { URDFRobot } from 'urdf-loader';
import { RobotDescriptionHandler } from '../Services/ros/handlers/RobotDescription.handler';
import { MeshHandler } from '../Services/ros/handlers/Mesh.handler';
import type { MeshPayload } from '../Services/ros/handlers/Mesh.handler';
import { runWithConcurrency } from '../Utils/concurrency.utils';
import { formatCaughtError } from '../Utils/error.utils';
import { decodeStlPayload } from '../Utils/mesh.utils';

/** How long to wait for `/robot_description` before surfacing a hint to the user. */
const ROBOT_DESCRIPTION_TIMEOUT_MS = 20000;
/** Concurrent mesh fetches for STL — keep low; multi-MB responses share one websocket. */
const MESH_FETCH_CONCURRENCY_STL = 2;
/** Concurrent mesh fetches for DAE — small payloads; allow more parallelism than STL. */
const MESH_FETCH_CONCURRENCY_DAE = 8;

// ---------------------------------------------------------------------------
// Module-level cache — shared across all component instances in a session.
// Keyed by the URDF source so a republished model triggers a reload.
// ---------------------------------------------------------------------------
type GlobalCache =
    | { ready: false }
    | { ready: true; urdf: string; robot: URDFRobot };

let globalCache: GlobalCache = { ready: false };

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseRobotModelReturn {
    robot: URDFRobot | null;
    loading: boolean;
    loadingStatus: string;
    /** Mesh-load progress in [0, 1]; 0 until the first mesh is queued. */
    progress: number;
    error: string | null;
    reload: () => void;
}

export function useRobotModel(): UseRobotModelReturn {
    const [robot, setRobot] = useState<URDFRobot | null>(
        globalCache.ready ? globalCache.robot : null,
    );
    const [loading, setLoading]             = useState(!globalCache.ready);
    const [loadingStatus, setLoadingStatus] = useState('');
    const [progress, setProgress]           = useState(0);
    const [error, setError]                 = useState<string | null>(null);

    // The URDF string most recently parsed — guards against re-parsing the same
    // model when the latched topic re-delivers it (e.g. after a reconnect).
    const loadedUrdfRef = useRef<string | null>(globalCache.ready ? globalCache.urdf : null);
    // Bumped by reload() to force a fresh subscription + parse.
    const [reloadToken, setReloadToken] = useState(0);

    const parseAndLoad = useCallback(async (urdf: string) => {
        if (!isWebGLAvailable()) {
            setError('WebGL is not supported in this browser.');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setProgress(0);
            setError(null);
            setLoadingStatus('Parsing URDF model…');

            // urdf-loader calls loadMeshCb synchronously per <mesh> during parse()
            // and wires the result into the scene graph when `done` fires. We fetch
            // each mesh over the ROS service, so the fetches are queued here and run
            // pooled after parse() returns.
            const colladaLoader = new ColladaLoader();
            const stlLoader = new STLLoader();
            const meshCache = new Map<string, Promise<MeshPayload>>(); // dedupe shared meshes
            const tasks: Array<() => Promise<void>> = [];
            let total = 0;
            let completed = 0;
            let failed = 0;
            let lastError = '';
            let stlCount = 0;

            const loader = new URDFLoader();
            loader.loadMeshCb = (path, _manager, done) => {
                tasks.push(async () => {
                    try {
                        const lower = path.toLowerCase();
                        let cached = meshCache.get(path);
                        if (!cached) {
                            cached = MeshHandler.getMesh(path);
                            meshCache.set(path, cached);
                        }
                        const payload = await cached;
                        if (lower.endsWith('.dae')) {
                            if (payload.encoding !== 'utf8') {
                                throw new Error(
                                    `expected utf8 DAE payload, got '${payload.encoding}' for ${path}`,
                                );
                            }
                            done(colladaLoader.parse(payload.data, '').scene);
                        } else if (lower.endsWith('.stl')) {
                            const geometry = stlLoader.parse(await decodeStlPayload(payload));
                            const stlMesh = new THREE.Mesh(
                                geometry,
                                new THREE.MeshPhongMaterial({ color: 0xb0b0b0 }),
                            );
                            done(stlMesh);
                        } else {
                            throw new Error(`unsupported mesh type: ${path}`);
                        }
                    } catch (e) {
                        failed++;
                        lastError = formatCaughtError(e);
                        // urdf-loader skips the mesh when an error is passed; the
                        // typings require an Object3D, so cast the unused null.
                        done(null as unknown as Parameters<typeof done>[0], e instanceof Error ? e : new Error(lastError));
                    } finally {
                        completed++;
                        if (total > 0) setProgress(Math.min(0.99, completed / total));
                        setLoadingStatus(`Loading meshes (${completed}/${total})…`);
                    }
                });
                if (path.toLowerCase().endsWith('.stl')) stlCount++;
            };
            const loadedRobot = loader.parse(urdf);
            total = tasks.length;

            // Reveal the model now so its meshes stream into the live scene as
            // they arrive — the robot is a shared scene graph that keeps mutating
            // while meshes load. Mark this URDF as in-flight to block a duplicate
            // parse if the latched topic re-delivers it mid-load.
            loadedUrdfRef.current = urdf;
            setRobot(loadedRobot);

            setLoadingStatus(`Loading meshes (0/${total})…`);
            const concurrency = stlCount > 0
                ? MESH_FETCH_CONCURRENCY_STL
                : MESH_FETCH_CONCURRENCY_DAE;
            await runWithConcurrency(tasks, concurrency);

            if (total > 0 && failed === total) {
                throw new Error(
                    `Could not load any meshes (${lastError}).\n` +
                    'Is the mesh/get service running? Rebuild lucy_msgs + lucy_config_pipeline,\n' +
                    'restart the stack, and refresh the control panel.',
                );
            }

            // Commit to the session cache only once we have a usable model, so a
            // total failure doesn't leave an empty robot cached for later mounts.
            globalCache = { ready: true, urdf, robot: loadedRobot };

            const linkCount  = Object.keys(loadedRobot.links).length;
            const jointCount = Object.keys(loadedRobot.joints).length;
            const actuated   = Object.values(loadedRobot.joints).filter(
                j => j.jointType === 'revolute' || j.jointType === 'continuous',
            ).length;
            console.debug(
                `[useRobotModel] Done — ${linkCount} links, ${jointCount} joints ` +
                `(${actuated} actuated), ${total - failed}/${total} meshes`,
            );
            setLoadingStatus('Done');
            setProgress(1);
            setLoading(false);

        } catch (err) {
            // Clear the in-flight guard so a retry (or topic re-delivery) re-parses.
            loadedUrdfRef.current = null;
            setError(err instanceof Error ? err.message : 'Failed to load robot model');
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let cancelled = false;

        // If nothing arrives in time, the robot description topic is probably
        // not being published — surface an actionable hint instead of spinning.
        const timeout = window.setTimeout(() => {
            if (cancelled || globalCache.ready) return;
            setError(
                'No URDF received on /robot_description.\n' +
                'Connect to the ROS bridge and make sure robot_state_publisher is running\n' +
                '(e.g. the Lucy bringup launch).',
            );
            setLoading(false);
        }, ROBOT_DESCRIPTION_TIMEOUT_MS);

        const unsubscribe = RobotDescriptionHandler.getInstance().subscribe((urdf) => {
            if (cancelled) return;
            if (!urdf) {
                // Disconnected / not published yet. Keep any cached model on
                // screen; otherwise show the waiting state.
                if (!globalCache.ready) {
                    setLoading(true);
                    setLoadingStatus('Waiting for robot description from ROS…');
                }
                return;
            }
            if (urdf === loadedUrdfRef.current) return; // already parsed this model
            window.clearTimeout(timeout);
            void parseAndLoad(urdf);
        });

        return () => {
            cancelled = true;
            window.clearTimeout(timeout);
            unsubscribe();
        };
    }, [parseAndLoad, reloadToken]);

    const reload = useCallback(() => {
        // Re-running the hook alone would not touch the rosbridge subscription.
        RobotDescriptionHandler.getInstance().resubscribe();
        globalCache           = { ready: false };
        loadedUrdfRef.current = null;
        setRobot(null);
        setLoading(true);
        setProgress(0);
        setError(null);
        setLoadingStatus('');
        setReloadToken(t => t + 1);
    }, []);

    return { robot, loading, loadingStatus, progress, error, reload };
}
