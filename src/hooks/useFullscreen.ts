import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

/**
 * Fullscreen state for one element. Attach `ref` to the node that should fill
 * the screen; `isFullscreen` follows the browser (so Esc is picked up too).
 */
export function useFullscreen<T extends HTMLElement>(): {
    ref: RefObject<T | null>;
    isFullscreen: boolean;
    toggle: () => void;
} {
    const ref = useRef<T>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const toggle = useCallback(() => {
        const container = ref.current;
        if (!container) { return; }

        if (!document.fullscreenElement) {
            container.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            document.exitFullscreen().catch(err => {
                console.error(`Error attempting to disable fullscreen: ${err.message}`);
            });
        }
    }, []);

    return { ref, isFullscreen, toggle };
}
