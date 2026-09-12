/*
 * Copyright 2025-2026 Sentience Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useEffect, useRef } from 'react';
import { useRosConnection } from './useRosConnection.hook.ts';

/**
 * Dismisses a ROS-backed overlay when the bridge link drops.
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
