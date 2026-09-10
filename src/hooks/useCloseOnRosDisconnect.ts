import { useEffect, useRef } from 'react';
import { useRosConnection } from './useRosConnection.hook.ts';

/**
 * Dismisses a ROS-backed overlay when the bridge link drops.
 *
 * Only the connected -> disconnected transition closes. The status starts at
 * 'disconnected' on a cold load, so reacting to "is disconnected" instead would
 * wipe the floating windows restored from localStorage before auto-connect ever
 * had a chance to dial.
 */
export function useCloseOnRosDisconnect(isOpen: boolean, close: () => void): void {
    const { isConnected } = useRosConnection();
    const wasConnectedRef = useRef(false);
    const isOpenRef = useRef(isOpen);
    const closeRef = useRef(close);

    // Kept in refs so a caller passing an inline arrow doesn't re-arm the effect.
    isOpenRef.current = isOpen;
    closeRef.current = close;

    useEffect(() => {
        if (isConnected) {
            wasConnectedRef.current = true;
            return;
        }
        if (!wasConnectedRef.current) { return; }
        wasConnectedRef.current = false;
        if (isOpenRef.current) { closeRef.current(); }
    }, [isConnected]);
}
