/**
 * Robot render component backed by urdf-loader.
 *
 * urdf-loader handles URDF parsing, FK, Collada/STL loading, and visual
 * origins natively — we just render the resulting Three.js scene graph via
 * React Three Fiber's <primitive> and update joint angles every frame.
 *
 * Coordinate system:
 *   URDF / ROS uses Z-up. Three.js uses Y-up.
 *   urdf-loader does NOT auto-convert, so we wrap the robot in a group
 *   rotated Rx(-π/2) — exactly what robot_viewer does with its world object.
 */

import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { URDFRobot } from 'urdf-loader';
import { UI_ACCENT_GREEN } from '../Constants/uiTheme';

export interface RobotFKModelProps {
    robot: URDFRobot;
    /** URDF joint name → current angle (rad). */
    jointAngles: Map<string, number>;
    opacity?: number;
    wireframe?: boolean;
    /** When true, restores the original DAE/mesh materials instead of the green override. */
    useOriginalTexture?: boolean;
}

export const RobotFKModel: React.FC<RobotFKModelProps> = ({
    robot,
    jointAngles,
    opacity = 0.85,
    wireframe = false,
    useOriginalTexture = true,
}) => {
    const originalMaterialsRef = useRef<Map<THREE.Mesh, THREE.Material | THREE.Material[]>>(new Map());
    const greenMaterialsRef = useRef<THREE.MeshStandardMaterial[]>([]);

    // ------------------------------------------------------------------
    // useLayoutEffect runs synchronously after commit, before useEffect.
    // This guarantees originals are captured before any green is applied,
    // even if the canvas renders a frame between layout and passive effects.
    // Cleanup restores originals so the next mount re-captures a clean state.
    // ------------------------------------------------------------------
    useLayoutEffect(() => {
        const originals = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
        robot.traverse(child => {
            if ((child as THREE.Mesh).isMesh) {
                originals.set(child as THREE.Mesh, (child as THREE.Mesh).material);
            }
        });
        originalMaterialsRef.current = originals;

        // Ignore URDF joint limits — real ROS angles may exceed them.
        for (const joint of Object.values(robot.joints)) {
            joint.ignoreLimits = true;
        }

        return () => {
            originals.forEach((mat, mesh) => { mesh.material = mat; });
        };
    }, [robot]);

    // ------------------------------------------------------------------
    // Apply green or original materials whenever appearance props change.
    // Runs after useLayoutEffect so originalMaterialsRef is always populated.
    // ------------------------------------------------------------------
    useEffect(() => {
        greenMaterialsRef.current.forEach(m => m.dispose());
        greenMaterialsRef.current = [];

        robot.traverse(child => {
            if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh;
                if (useOriginalTexture) {
                    const orig = originalMaterialsRef.current.get(mesh);
                    if (orig) {
                        mesh.material = orig;
                        const mats = Array.isArray(orig) ? orig : [orig];
                        mats.forEach(m => { m.needsUpdate = true; });
                    }
                } else {
                    const mat = new THREE.MeshStandardMaterial({
                        color: UI_ACCENT_GREEN,
                        transparent: true,
                        opacity,
                        wireframe,
                        roughness: 0.3,
                        metalness: 0.7,
                        side: THREE.DoubleSide,
                    });
                    mesh.material = mat;
                    greenMaterialsRef.current.push(mat);
                }
            }
        });

        return () => {
            greenMaterialsRef.current.forEach(m => m.dispose());
            greenMaterialsRef.current = [];
        };
    }, [robot, opacity, wireframe, useOriginalTexture]);

    // ------------------------------------------------------------------
    // Push live joint angles into the urdf-loader scene graph each frame.
    // ------------------------------------------------------------------
    useFrame(() => {
        if (jointAngles.size === 0) return;
        const values: Record<string, number> = {};
        jointAngles.forEach((angle, name) => { values[name] = angle; });
        robot.setJointValues(values);
    });

    // urdf-loader emits geometry in URDF/ROS Z-up space.
    // Rx(-π/2) converts to Three.js Y-up — matching robot_viewer's world rotation.
    return (
        <group rotation={[-Math.PI / 2, 0, 0]}>
            <primitive object={robot} />
        </group>
    );
};
