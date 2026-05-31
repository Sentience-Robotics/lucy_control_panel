import { useEffect, useState } from 'react';
import { RosBridgeService } from '../Services/ros/ros.service.ts';

/**
 * Of the given `topics`, the subset that currently has at least one publisher,
 * refreshed while `enabled` and whenever the connection (re)establishes.
 *
 * Availability is based on *publishers*, not topic existence: a rosbridge
 * subscription (which our own stream viewer creates) makes a topic appear in
 * the graph, so "does the topic exist" gives false positives. "Does anything
 * publish it" does not.
 *
 * Returns `null` while unknown — not yet fetched, disconnected, or the lookup
 * failed (e.g. no rosapi). Callers should treat `null` as "can't tell, assume
 * available" so a genuinely-working stream is never blocked.
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
