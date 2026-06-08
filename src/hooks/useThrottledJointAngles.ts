/**
 * Subscribes to /joint_states at full ROS rate (writes to a ref),
 * then drains into React state at a fixed rate (default 10 Hz).
 *
 * This mirrors the blue-dot pattern in RobotControlPanel: no re-render
 * per message — only the interval tick triggers FK recalculation.
 */

import { useState, useRef, useEffect } from 'react';
import { JointStateHandler } from '../Services/ros/handlers/JointState.handler';

export function useThrottledJointAngles(isConnected: boolean, hz = 10): Map<string, number> {
    const [jointAngles, setJointAngles] = useState<Map<string, number>>(new Map());
    const latestRef = useRef<Map<string, number>>(new Map());
    const dirtyRef = useRef(false);
    const loggedOnceRef = useRef(false);

    // Write into ref at full ROS rate — no React re-renders here.
    useEffect(() => {
        if (!isConnected) {
            latestRef.current.clear();
            dirtyRef.current = false;
            loggedOnceRef.current = false;
            setJointAngles(new Map());
            return;
        }
        return JointStateHandler.getInstance().subscribeToJointStates((positions) => {
            for (const { name, value } of positions) {
                latestRef.current.set(name, value);
            }
            dirtyRef.current = true;

            // Log joint names received from ROS once per connection (debug only).
            if (!loggedOnceRef.current) {
                loggedOnceRef.current = true;
                console.debug(
                    '[3DViewer] /joint_states joint names:',
                    positions.map(p => p.name),
                );
            }
        });
    }, [isConnected]);

    // Drain to state at `hz` — only when something actually changed.
    useEffect(() => {
        if (!isConnected) return;
        const interval = setInterval(() => {
            if (!dirtyRef.current) return;
            dirtyRef.current = false;
            setJointAngles(new Map(latestRef.current));
        }, 1000 / hz);
        return () => clearInterval(interval);
    }, [isConnected, hz]);

    return jointAngles;
}
