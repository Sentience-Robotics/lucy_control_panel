/**
 * Loads the robot URDF and all mesh files via urdf-loader (same library as
 * robot_viewer), which handles full FK, DAE Collada loading, visual origins,
 * and joint transforms natively.
 *
 * Module-level cache: once loaded in a browser session, subsequent mounts
 * (e.g. closing/reopening the stream modal) reuse the parsed data instantly.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { isWebGLAvailable } from 'three-stdlib';
import URDFLoader from 'urdf-loader';
import type { URDFRobot } from 'urdf-loader';

// ---------------------------------------------------------------------------
// Module-level cache — shared across all component instances in a session.
// ---------------------------------------------------------------------------
type GlobalCache =
    | { ready: false }
    | { ready: true; robot: URDFRobot };

let globalCache: GlobalCache = { ready: false };

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseRobotModelReturn {
    robot: URDFRobot | null;
    loading: boolean;
    loadingStatus: string;
    error: string | null;
    /** Force a full reload (clears cache). Wired to the Retry button. */
    reload: () => void;
}

export function useRobotModel(): UseRobotModelReturn {
    const [robot, setRobot] = useState<URDFRobot | null>(
        globalCache.ready ? globalCache.robot : null,
    );
    const [loading, setLoading]           = useState(!globalCache.ready);
    const [loadingStatus, setLoadingStatus] = useState('');
    const [error, setError]               = useState<string | null>(null);

    // StrictMode double-mount guard + cache-hit guard (ref survives simulated unmount).
    const loadStartedRef = useRef(globalCache.ready);

    const loadRobot = useCallback(async () => {
        if (!isWebGLAvailable()) {
            setError('WebGL is not supported in this browser.');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // ------------------------------------------------------------------
            // Pre-flight: ask the dev server whether .env paths are configured.
            // The /robot-env-check endpoint is injected by vite.config.ts and
            // only exists in dev mode — if it's absent we just proceed.
            // ------------------------------------------------------------------
            setLoadingStatus('Checking .env configuration…');
            const envCheck = await fetch('/robot-env-check').catch(() => null);
            if (envCheck?.ok) {
                const status: {
                    urdfConfigured: boolean;
                    meshesConfigured: boolean;
                    urdfExists: boolean;
                    meshesExists: boolean;
                    isXacro: boolean;
                } = await envCheck.json();

                const missing: string[] = [];
                if (!status.urdfConfigured)   missing.push('ROBOT_URDF_PATH');
                if (!status.meshesConfigured) missing.push('ROBOT_MESHES_PATH');
                if (missing.length > 0) {
                    throw new Error(
                        `.env misconfiguration — missing variable(s): ${missing.join(', ')}.\n` +
                        'Add them to your .env file (see .env.example).',
                    );
                }
                if (!status.urdfExists) {
                    const hint = status.isXacro
                        ? 'If you just changed .env, restart the dev server so the new path is picked up.'
                        : 'Check the path in your .env file.';
                    throw new Error(
                        `.env misconfiguration — ROBOT_URDF_PATH points to a file that does not exist on disk.\n${hint}`,
                    );
                }
                if (!status.meshesExists) {
                    const hint = status.isXacro
                        ? 'For a .xacro URDF, ROBOT_MESHES_PATH should be the meshes root (e.g. …/robot_description/meshes), not the dae/ subfolder.'
                        : 'Check the path in your .env file.';
                    throw new Error(
                        `.env misconfiguration — ROBOT_MESHES_PATH points to a directory that does not exist on disk.\n${hint}`,
                    );
                }
            }

            // ------------------------------------------------------------------
            // Load the URDF via urdf-loader.
            //
            // urdf-loader derives the base path from the URL: loading /robot.urdf
            // gives workingPath = "/". Mesh filenames in the URDF are relative
            // (e.g. "meshes/dae/stand.dae"), so resolved URLs become
            // "/meshes/dae/stand.dae" — exactly what our vite dev server serves.
            // ------------------------------------------------------------------
            setLoadingStatus('Loading URDF model…');

            const loader = new URDFLoader();

            // Track progress via a wrapper around the default mesh loader.
            let meshesQueued = 0;
            let meshesDone   = 0;
            const baseCb = loader.defaultMeshLoader.bind(loader);
            loader.loadMeshCb = (url, manager, done) => {
                meshesQueued++;
                setLoadingStatus(`Loading meshes (${meshesDone}/${meshesQueued})…`);
                baseCb(url, manager, (obj, err) => {
                    meshesDone++;
                    setLoadingStatus(`Loading meshes (${meshesDone}/${meshesQueued})…`);
                    done(obj, err);
                });
            };

            const loadedRobot = await loader.loadAsync('/robot.urdf');

            const linkCount  = Object.keys(loadedRobot.links).length;
            const jointCount = Object.keys(loadedRobot.joints).length;
            const actuated   = Object.values(loadedRobot.joints).filter(
                j => j.jointType === 'revolute' || j.jointType === 'continuous',
            ).length;
            console.debug(
                `[useRobotModel] Done — ${linkCount} links, ${jointCount} joints ` +
                `(${actuated} actuated), ${meshesDone} meshes`,
            );
            setLoadingStatus(`Done — ${meshesDone} meshes loaded`);

            globalCache = { ready: true, robot: loadedRobot };
            setRobot(loadedRobot);
            setLoading(false);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load robot model');
            setLoading(false);
        }
    }, []); // no deps — only uses refs and module-level state

    useEffect(() => {
        if (loadStartedRef.current) return;
        loadStartedRef.current = true;
        void loadRobot();
    }, [loadRobot]);

    const reload = useCallback(() => {
        globalCache           = { ready: false };
        loadStartedRef.current = false;
        setRobot(null);
        setLoading(true);
        setError(null);
        setLoadingStatus('');
        void loadRobot();
    }, [loadRobot]);

    return { robot, loading, loadingStatus, error, reload };
}
