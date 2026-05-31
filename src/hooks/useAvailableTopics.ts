import { useEffect, useState } from 'react';
import { RosBridgeService } from '../Services/ros/ros.service.ts';

/**
 * Set of ROS topic names currently advertised on the bridge, refreshed while
 * `enabled` and whenever the connection (re)establishes.
 *
 * Returns `null` while the list is unknown — not yet fetched, disconnected, or
 * the lookup failed. Callers should treat `null` as "can't tell, assume
 * available" so a genuinely-working stream is never blocked.
 */
export function useAvailableTopics(enabled: boolean): Set<string> | null {
    const [topics, setTopics] = useState<Set<string> | null>(null);

    useEffect(() => {
        if (!enabled) {
            setTopics(null);
            return;
        }

        let cancelled = false;
        const service = RosBridgeService.getInstance();

        const refresh = () => {
            service.getTopics()
                .then(list => { if (!cancelled) setTopics(new Set(list)); })
                .catch(() => { if (!cancelled) setTopics(null); });
        };

        refresh();
        const unsubscribe = service.onStatusChange(status => {
            if (status === 'connected') refresh();
            else if (!cancelled) setTopics(null);
        });

        return () => {
            cancelled = true;
            unsubscribe();
        };
    }, [enabled]);

    return topics;
}
