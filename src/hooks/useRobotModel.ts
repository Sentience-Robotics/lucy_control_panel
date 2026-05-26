/**
 * Loads the robot URDF and all mesh files (STL or DAE/Collada), returning
 * link-frame data ready to pass to `RobotFKModel` for FK rendering.
 *
 * Module-level cache: once loaded in a browser session, subsequent mounts
 * (e.g. closing/reopening the stream modal) reuse the parsed data instantly.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { isWebGLAvailable, STLLoader, ColladaLoader, mergeBufferGeometries } from 'three-stdlib';
import * as THREE from 'three';
import { RobotPathResolver } from '../Constants/robotConfig';
import { parseVec3 } from '../Components/RobotFKModel';
import type { LinkMesh, UrdfJointFull } from '../Components/RobotFKModel';

// ---------------------------------------------------------------------------
// Mesh loading helpers
// ---------------------------------------------------------------------------

/**
 * Traverse a Collada scene, apply each mesh's world transform to its geometry,
 * and merge everything into a single BufferGeometry.
 */
function extractColladaGeometry(scene: THREE.Object3D): THREE.BufferGeometry {
    const geometries: THREE.BufferGeometry[] = [];
    scene.updateMatrixWorld(true);
    scene.traverse(child => {
        if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            const geo = (mesh.geometry as THREE.BufferGeometry).clone();
            geo.applyMatrix4(mesh.matrixWorld);
            geometries.push(geo);
        }
    });
    if (geometries.length === 0) return new THREE.BufferGeometry();
    if (geometries.length === 1) return geometries[0];
    return mergeBufferGeometries(geometries) ?? new THREE.BufferGeometry();
}

/**
 * Load a single mesh file, choosing the right loader based on file extension.
 * Supports .stl and .dae (Collada). Returns a ready BufferGeometry.
 */
async function loadMeshGeometry(
    url: string,
    stlLoader: STLLoader,
    colladaLoader: ColladaLoader,
): Promise<THREE.BufferGeometry> {
    const ext = url.split('.').pop()?.toLowerCase();

    if (ext === 'dae') {
        const collada = await colladaLoader.loadAsync(url);
        const geo = extractColladaGeometry(collada.scene);
        geo.computeVertexNormals();
        geo.computeBoundingBox();
        return geo;
    }

    // Default: STL
    return new Promise<THREE.BufferGeometry>((resolve, reject) => {
        stlLoader.load(
            url,
            geo => { geo.computeVertexNormals(); geo.computeBoundingBox(); resolve(geo); },
            undefined,
            reject,
        );
    });
}

// ---------------------------------------------------------------------------
// Module-level cache — shared across all component instances in a session.
// ---------------------------------------------------------------------------
type GlobalCache =
    | { ready: false }
    | { ready: true; linkMeshes: LinkMesh[]; urdfJoints: Map<string, UrdfJointFull> };

let globalCache: GlobalCache = { ready: false };

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseRobotModelReturn {
    linkMeshes: LinkMesh[];
    urdfJoints: Map<string, UrdfJointFull>;
    loading: boolean;
    loadingStatus: string;
    error: string | null;
    /** Force a full reload (clears cache). Wired to the Retry button. */
    reload: () => void;
}

export function useRobotModel(): UseRobotModelReturn {
    const [linkMeshes, setLinkMeshes] = useState<LinkMesh[]>(
        globalCache.ready ? globalCache.linkMeshes : [],
    );
    const [urdfJoints, setUrdfJoints] = useState<Map<string, UrdfJointFull>>(
        globalCache.ready ? globalCache.urdfJoints : new Map(),
    );
    const [loading, setLoading] = useState(!globalCache.ready);
    const [loadingStatus, setLoadingStatus] = useState('');
    const [error, setError] = useState<string | null>(null);

    const stlLoaderRef = useRef(new STLLoader());
    const daeLoaderRef = useRef(new ColladaLoader());
    // If cache is already populated, mark as started so the effect is a no-op.
    const loadStartedRef = useRef(globalCache.ready);

    const loadModel = useCallback(async () => {
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

            setLoadingStatus('Fetching URDF…');
            const res = await fetch(RobotPathResolver.getUrdfPath());
            if (!res.ok) throw new Error('Failed to load URDF file');
            const urdfDoc = new DOMParser().parseFromString(await res.text(), 'text/xml');

            // --- Parse links → visuals ---
            type VisualEntry = {
                meshFilename: string;
                xyz: [number, number, number];
                rpy: [number, number, number];
                scale: [number, number, number];
            };
            const linkVisualsMap = new Map<string, VisualEntry[]>();

            for (const linkEl of urdfDoc.querySelectorAll('link')) {
                const linkName = linkEl.getAttribute('name') ?? '';
                const visuals: VisualEntry[] = [];
                for (const visualEl of linkEl.querySelectorAll('visual')) {
                    const meshEl = visualEl.querySelector('mesh');
                    if (!meshEl) continue;
                    const filename = meshEl.getAttribute('filename');
                    if (!filename) continue;
                    const originEl = visualEl.querySelector('origin');
                    const scaleAttr = meshEl.getAttribute('scale');
                    visuals.push({
                        meshFilename: filename,
                        xyz: parseVec3(originEl?.getAttribute('xyz')),
                        rpy: parseVec3(originEl?.getAttribute('rpy')),
                        scale: scaleAttr ? parseVec3(scaleAttr) : [1, 1, 1],
                    });
                }
                if (visuals.length > 0) linkVisualsMap.set(linkName, visuals);
            }

            // --- Parse joints ---
            const childToJoint = new Map<string, UrdfJointFull>();
            for (const jointEl of urdfDoc.querySelectorAll('joint')) {
                const parentEl = jointEl.querySelector('parent');
                const childEl = jointEl.querySelector('child');
                if (!parentEl || !childEl) continue;
                const originEl = jointEl.querySelector('origin');
                const axisEl = jointEl.querySelector('axis');
                const childLink = childEl.getAttribute('link') ?? '';
                childToJoint.set(childLink, {
                    jointName: jointEl.getAttribute('name') ?? '',
                    parentLink: parentEl.getAttribute('link') ?? '',
                    childLink,
                    xyz: parseVec3(originEl?.getAttribute('xyz')),
                    rpy: parseVec3(originEl?.getAttribute('rpy')),
                    axis: parseVec3(axisEl?.getAttribute('xyz') ?? '1 0 0'),
                    type: jointEl.getAttribute('type') ?? 'fixed',
                });
            }

            const totalJoints = urdfDoc.querySelectorAll('joint').length;
            const revoluteCount = [...childToJoint.values()].filter(
                j => j.type === 'revolute' || j.type === 'continuous',
            ).length;
            console.debug(
                `[useRobotModel] ${urdfDoc.querySelectorAll('link').length} links, ` +
                `${totalJoints} joints (${revoluteCount} actuated)`,
            );

            // --- Load mesh geometries (STL or DAE) ---
            const allVisuals: Array<{ linkName: string } & VisualEntry> = [];
            for (const [linkName, visuals] of linkVisualsMap) {
                for (const v of visuals) allVisuals.push({ linkName, ...v });
            }

            const total = allVisuals.length;
            const linkMeshArray: LinkMesh[] = [];
            let loaded = 0;
            let failed = 0;

            for (const v of allVisuals) {
                const shortName = v.meshFilename.split('/').pop() ?? v.meshFilename;
                setLoadingStatus(`Loading mesh ${loaded + failed + 1}/${total}: ${shortName}`);

                const meshUrl = RobotPathResolver.resolveUrdfMeshPath(v.meshFilename);
                try {
                    const geometry = await loadMeshGeometry(
                        meshUrl,
                        stlLoaderRef.current,
                        daeLoaderRef.current,
                    );
                    loaded++;
                    linkMeshArray.push({
                        geometry,
                        linkName: v.linkName,
                        visualXyz: v.xyz,
                        visualRpy: v.rpy,
                        scale: v.scale,
                        name: v.meshFilename,
                    });
                } catch {
                    failed++;
                    console.warn(`[useRobotModel] Failed to load ${meshUrl}`);
                }
            }

            console.debug(`[useRobotModel] Done — loaded: ${loaded}, failed: ${failed}`);
            setLoadingStatus(`Done — ${loaded} meshes loaded`);

            globalCache = { ready: true, linkMeshes: linkMeshArray, urdfJoints: childToJoint };
            setLinkMeshes(linkMeshArray);
            setUrdfJoints(childToJoint);
            setLoading(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load robot model');
            setLoading(false);
        }
    }, []); // no deps — only uses refs and module-level state

    useEffect(() => {
        // StrictMode double-mount guard: ref survives the simulated unmount.
        // Cache hit guard: if data is already loaded, skip entirely.
        if (loadStartedRef.current) return;
        loadStartedRef.current = true;
        void loadModel();
    }, [loadModel]);

    const reload = useCallback(() => {
        globalCache = { ready: false };
        loadStartedRef.current = false;
        setLinkMeshes([]);
        setUrdfJoints(new Map());
        setLoading(true);
        setError(null);
        setLoadingStatus('');
        void loadModel();
    }, [loadModel]);

    return { linkMeshes, urdfJoints, loading, loadingStatus, error, reload };
}
