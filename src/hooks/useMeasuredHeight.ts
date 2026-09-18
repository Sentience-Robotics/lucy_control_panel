import { useCallback, useRef, useState } from 'react';

/**
 * Tracks an element's rendered height.
 *
 * Sticky offsets are derived from the height of whatever sits above them, and
 * those rows reflow - wrapping on narrow screens, growing when a section is
 * disclosed - so the number has to be observed rather than assumed.
 *
 * Returns a callback ref, so observation starts and stops as the node mounts
 * and unmounts. There is no dependency list to keep in step with whatever
 * condition happens to render the element.
 */
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
