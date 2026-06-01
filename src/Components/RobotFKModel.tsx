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

import React, { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { URDFRobot } from 'urdf-loader';
import { UI_ACCENT_GREEN } from '../Constants/uiTheme';

// Pristine DAE/mesh materials, captured per robot instance and kept at module
// level so they survive remounts (the robot itself is module-cached in
// useRobotModel). Capture happens before any override is applied, so a green
// material can never be mistaken for the original — this is what makes the
// GRN ↔ DAE switch reliable.
const robotOriginalMaterials = new WeakMap<
    URDFRobot,
    Map<THREE.Mesh, THREE.Material | THREE.Material[]>
>();

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
    const greenMaterialsRef = useRef<THREE.MeshStandardMaterial[]>([]);

    useEffect(() => {
        let originals = robotOriginalMaterials.get(robot);
        if (!originals) {
            originals = new Map();
            robotOriginalMaterials.set(robot, originals);
        }

        robot.traverse(child => {
            const mesh = child as THREE.Mesh;
            if (!mesh.isMesh) return;

            // Capture the pristine material the first time we ever touch this
            // mesh — before any green override — so originals are always DAE.
            if (!originals!.has(mesh)) {
                originals!.set(mesh, mesh.material);
            }

            // Ignore URDF joint limits — real ROS angles may exceed them.
            for (const joint of Object.values(robot.joints)) {
                joint.ignoreLimits = true;
            }

            if (useOriginalTexture) {
                mesh.material = originals!.get(mesh)!;
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
        });

        return () => {
            // Restore pristine originals, then drop the green materials we made.
            robot.traverse(child => {
                const mesh = child as THREE.Mesh;
                if (!mesh.isMesh) return;
                const orig = originals!.get(mesh);
                if (orig) mesh.material = orig;
            });
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
