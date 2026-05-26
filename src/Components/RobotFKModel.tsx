/**
 * Shared FK (forward-kinematics) types, math utilities, and Three.js render components
 * used by both Robot3DViewer (full-page) and Robot3DMiniViewer (modal embed).
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { UI_ACCENT_GREEN } from '../Constants/uiTheme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UrdfJointFull {
    jointName: string;
    parentLink: string;
    childLink: string;
    xyz: [number, number, number];
    rpy: [number, number, number];
    /** Rotation axis in link frame. Defaults to [1,0,0] per URDF spec. */
    axis: [number, number, number];
    /** 'revolute' | 'continuous' | 'prismatic' | 'fixed' | 'floating' | 'planar' */
    type: string;
}

/** Per-visual mesh in link-local frame — no pre-computed world position. */
export interface LinkMesh {
    geometry: THREE.BufferGeometry;
    linkName: string;
    visualXyz: [number, number, number];
    visualRpy: [number, number, number];
    scale: [number, number, number];
    name: string;
}

/** Fully-resolved, ready-to-render mesh. */
export interface ResolvedMesh {
    geometry: THREE.BufferGeometry;
    position: [number, number, number];
    quaternion: THREE.Quaternion;
    scale: [number, number, number];
    name: string;
}

// ---------------------------------------------------------------------------
// Math utilities
// ---------------------------------------------------------------------------

/** Parse a space-separated URDF attribute (xyz / rpy / scale) into a triple. */
export const parseVec3 = (attr: string | null | undefined): [number, number, number] => {
    if (!attr) return [0, 0, 0];
    const v = attr.trim().split(/\s+/).map(Number);
    return [v[0] || 0, v[1] || 0, v[2] || 0];
};

/**
 * Build a 4×4 homogeneous transform from a URDF `<origin>`.
 * URDF RPY = extrinsic fixed-axis XYZ → intrinsic ZYX in Three.js terms.
 */
export const makeTransform = (
    xyz: [number, number, number],
    rpy: [number, number, number],
): THREE.Matrix4 => {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rpy[0], rpy[1], rpy[2], 'ZYX'));
    return new THREE.Matrix4().compose(new THREE.Vector3(...xyz), q, new THREE.Vector3(1, 1, 1));
};

// ---------------------------------------------------------------------------
// Three.js components
// ---------------------------------------------------------------------------

interface STLMeshProps {
    mesh: ResolvedMesh;
    opacity: number;
    wireframe: boolean;
}

export const STLMesh: React.FC<STLMeshProps> = ({ mesh, opacity, wireframe }) => (
    <mesh
        geometry={mesh.geometry}
        position={mesh.position}
        quaternion={mesh.quaternion}
        scale={mesh.scale}
    >
        <meshStandardMaterial
            key={`${wireframe}-${opacity}`}
            color={UI_ACCENT_GREEN}
            transparent
            opacity={opacity}
            wireframe={wireframe}
            roughness={0.3}
            metalness={0.7}
        />
    </mesh>
);

export interface RobotFKModelProps {
    linkMeshes: LinkMesh[];
    /** childLink → joint info. */
    urdfJoints: Map<string, UrdfJointFull>;
    /** URDF joint name → current angle (rad). */
    jointAngles: Map<string, number>;
    opacity?: number;
    wireframe?: boolean;
}

/**
 * Computes forward kinematics and renders the robot mesh.
 * Re-runs on every `jointAngles` change (via useMemo).
 */
export const RobotFKModel: React.FC<RobotFKModelProps> = ({
    linkMeshes,
    urdfJoints,
    jointAngles,
    opacity = 0.85,
    wireframe = false,
}) => {
    // Once we have live data, log any URDF actuated joints missing from /joint_states.
    const covCheckDoneRef = React.useRef(false);
    if (!covCheckDoneRef.current && jointAngles.size > 0) {
        covCheckDoneRef.current = true;
        const missing: string[] = [];
        for (const joint of urdfJoints.values()) {
            if (joint.type !== 'revolute' && joint.type !== 'continuous') continue;
            if (!jointAngles.has(joint.jointName)) {
                missing.push(joint.jointName);
            }
        }
        if (missing.length > 0) {
            console.warn('[3DViewer] URDF joints NOT found in /joint_states (will render at 0 rad):', missing);
        } else {
            console.debug('[3DViewer] All URDF actuated joints matched in /joint_states ✓');
        }
    }

    // Group rotation from .env (VITE_ROBOT_GROUP_ROTATION="rx,ry,rz" in radians).
    // DAE/xacro URDFs: ColladaLoader already converts Z-up→Y-up, so use "0,0,0".
    // STL URDFs: vertices are Z-up, so use "-1.5708,0,0" (Rx(-π/2)).
    const groupRotation = useMemo<[number, number, number]>(() => {
        const raw = import.meta.env.VITE_ROBOT_GROUP_ROTATION as string | undefined;
        if (!raw) return [-Math.PI / 2, 0, 0]; // safe default for STL URDFs
        const parts = raw.split(',').map(Number);
        if (parts.length === 3 && parts.every(n => !isNaN(n))) {
            return parts as [number, number, number];
        }
        return [-Math.PI / 2, 0, 0];
    }, []);

    // Detect mesh format: DAE (Collada) meshes have global Y-up vertices baked in by
    // ColladaLoader — skip FK and visual origins, just pass geometry through at identity.
    // STL meshes are in link-local Z-up space and need the full FK chain.
    const isDae = linkMeshes.length > 0 && linkMeshes[0].name.toLowerCase().endsWith('.dae');

    const resolvedMeshes = useMemo<ResolvedMesh[]>(() => {
        if (isDae) {
            // Pre-compute the conjugation factors once for all meshes.
            const Rx_neg90 = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
            const Rx_pos90 = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));

            const result = linkMeshes.map(lm => {
                // The visual RPY in this URDF has two distinct meanings:
                //
                // 1. Small values (e.g. 0.066 tilt, ±π/2 joint-angle baked into vertices):
                //    The mesh was exported from Blender with the rotation already baked into
                //    vertex positions.  Applying the RPY again would double-rotate it.
                //    → Use identity quaternion.
                //
                // 2. Near-π values (|rpy| > 2.9 rad): the mesh was exported with inverted
                //    normals / mirrored orientation (right-side parts, base stand).
                //    Backface culling makes them invisible; a π-flip corrects normals.
                //    → Apply the conjugated RPY so normals face outward.
                const hasNearPi = lm.visualRpy.some(v => Math.abs(v) > 2.9);
                let visualQ: THREE.Quaternion;
                if (hasNearPi) {
                    const q_urdf = new THREE.Quaternion().setFromEuler(
                        new THREE.Euler(lm.visualRpy[0], lm.visualRpy[1], lm.visualRpy[2], 'ZYX'),
                    );
                    // Conjugate: convert the URDF Z-up RPY into Three.js Y-up space:
                    //   q_yup = Rx(-90°) ∘ q_urdf ∘ Rx(+90°)
                    visualQ = Rx_neg90.clone().multiply(q_urdf).multiply(Rx_pos90);
                } else {
                    visualQ = new THREE.Quaternion(); // identity — baked-in vertices
                }

                const e = new THREE.Euler().setFromQuaternion(visualQ);
                console.debug(
                    `[3DViewer DAE] ${lm.name.split('/').pop()} | rpy=(${lm.visualRpy.map(v => v.toFixed(3)).join(',')})` +
                    ` nearPi=${hasNearPi} → euler=(${[e.x, e.y, e.z].map(v => v.toFixed(3)).join(',')})`,
                );

                return {
                    geometry: lm.geometry,
                    position: [0, 0, 0] as [number, number, number],
                    quaternion: visualQ,
                    scale: lm.scale,
                    name: lm.name,
                };
            });
            return result;
        }

        // --- Standard FK path for STL / local-space meshes ---
        const cache = new Map<string, THREE.Matrix4>();

        const getLinkWorldMat = (linkName: string): THREE.Matrix4 => {
            const hit = cache.get(linkName);
            if (hit) return hit;

            const joint = urdfJoints.get(linkName);
            if (!joint) {
                const m = new THREE.Matrix4();
                cache.set(linkName, m);
                return m;
            }

            const originMat = makeTransform(joint.xyz, joint.rpy);
            let childInParent: THREE.Matrix4;

            if (joint.type === 'revolute' || joint.type === 'continuous') {
                const angle = jointAngles.get(joint.jointName) ?? 0;
                const axis = new THREE.Vector3(...joint.axis).normalize();
                const rotQ = new THREE.Quaternion().setFromAxisAngle(axis, angle);
                const rotM = new THREE.Matrix4().makeRotationFromQuaternion(rotQ);
                childInParent = originMat.clone().multiply(rotM);
            } else {
                childInParent = originMat;
            }

            const result = new THREE.Matrix4().multiplyMatrices(
                getLinkWorldMat(joint.parentLink),
                childInParent,
            );
            cache.set(linkName, result);
            return result;
        };

        return linkMeshes.map(lm => {
            const worldMat = new THREE.Matrix4().multiplyMatrices(
                getLinkWorldMat(lm.linkName),
                makeTransform(lm.visualXyz, lm.visualRpy),
            );
            const pos = new THREE.Vector3();
            const quat = new THREE.Quaternion();
            const scl = new THREE.Vector3();
            worldMat.decompose(pos, quat, scl);
            return {
                geometry: lm.geometry,
                position: [pos.x, pos.y, pos.z] as [number, number, number],
                quaternion: quat,
                scale: lm.scale,
                name: lm.name,
            };
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [linkMeshes, urdfJoints, jointAngles, isDae]);

    return (
        <group rotation={groupRotation}>
            {resolvedMeshes.map((mesh, i) => (
                <STLMesh key={`${mesh.name}-${i}`} mesh={mesh} opacity={opacity} wireframe={wireframe} />
            ))}
        </group>
    );
};
