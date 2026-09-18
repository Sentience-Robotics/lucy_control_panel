/*
 * Copyright 2025-2026 Sentience Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useCallback, useRef, useState } from 'react';

/** Tracks an element's rendered height through a callback ref. */
export function useMeasuredHeight<T extends HTMLElement>(): [(node: T | null) => void, number] {
    const [height, setHeight] = useState(0);
    const observerRef = useRef<ResizeObserver | null>(null);

    const measuredRef = useCallback((node: T | null) => {
        observerRef.current?.disconnect();
        observerRef.current = null;
        if (!node) return;

        const update = () => setHeight(node.getBoundingClientRect().height);
        update();
        observerRef.current = new ResizeObserver(update);
        observerRef.current.observe(node);
    }, []);

    return [measuredRef, height];
}
