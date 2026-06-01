import { useEffect, useState } from 'react';
import { RosBridgeService } from '../Services/ros/ros.service.ts';

/**
 * Of the given `topics`, the subset that currently has a publisher — refreshed
 * while `enabled` and on every (re)connection.
 *
 * Returns `null` while unknown (not yet fetched, disconnected, or rosapi
 * absent). Treat `null` as "assume available" so a working stream is never
 * wrongly blocked.
 *
 * See RosBridgeService.getPublishers for why we check publishers, not mere
 * topic existence.
 */
export function useAvailableTopics(topics: string[], enabled: boolean): Set<string> | null {
    const [published, setPublished] = useState<Set<string> | null>(null);
    const topicsKey = topics.join('|');

    useEffect(() => {
        if (!enabled) {
            setPublished(null);
            return;
        }

        let cancelled = false;
        const service = RosBridgeService.getInstance();

        const refresh = () => {
            Promise.all(topics.map(topic => service.getPublishers(topic)))
                .then(publisherLists => {
                    if (cancelled) return;
                    const live = topics.filter((_, i) => publisherLists[i].length > 0);
                    setPublished(new Set(live));
                })
                .catch(err => {
                    console.warn('[useAvailableTopics] publisher lookup failed — availability unknown:', err.message);
                    if (!cancelled) setPublished(null);
                });
        };

        refresh();
        const unsubscribe = service.onStatusChange(status => {
            if (status === 'connected') refresh();
            else if (!cancelled) setPublished(null);
        });

        return () => {
            cancelled = true;
            unsubscribe();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [topicsKey, enabled]);

    return published;
}
