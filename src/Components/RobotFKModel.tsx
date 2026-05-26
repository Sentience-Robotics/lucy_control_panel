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

export interface RobotFKModelProps {
    robot: URDFRobot;
    /** URDF joint name → current angle (rad). */
    jointAngles: Map<string, number>;
    opacity?: number;
    wireframe?: boolean;
}

export const RobotFKModel: React.FC<RobotFKModelProps> = ({
    robot,
    jointAngles,
    opacity = 0.85,
    wireframe = false,
}) => {
    const materialsRef = useRef<THREE.MeshStandardMaterial[]>([]);

    // ------------------------------------------------------------------
    // Apply our green material to every mesh in the robot.
    // Runs on mount and whenever opacity / wireframe changes.
    // ------------------------------------------------------------------
    useEffect(() => {
        // Dispose any previously cloned materials.
        materialsRef.current.forEach(m => m.dispose());
        materialsRef.current = [];

        robot.traverse(child => {
            if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh;
                const mat = new THREE.MeshStandardMaterial({
                    color: UI_ACCENT_GREEN,
                    transparent: true,
                    opacity,
                    wireframe,
                    roughness: 0.3,
                    metalness: 0.7,
                    side: THREE.DoubleSide,
                });
                // Dispose the original material to avoid GPU leaks.
                if (mesh.material && !Array.isArray(mesh.material)) {
                    (mesh.material as THREE.Material).dispose();
                }
                mesh.material = mat;
                materialsRef.current.push(mat);
            }
        });

        // Ignore URDF joint limits — real ROS angles may exceed them.
        for (const joint of Object.values(robot.joints)) {
            joint.ignoreLimits = true;
        }

        return () => {
            materialsRef.current.forEach(m => m.dispose());
            materialsRef.current = [];
        };
    }, [robot, opacity, wireframe]);

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
