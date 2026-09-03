import { useMemo } from 'react';
import type { StreamSource } from '../Constants/rosConfig';
import { useAvailableTopics } from './useAvailableTopics.ts';
import { useRosConnection } from './useRosConnection.hook.ts';
import { useStreamSources } from './useStreamSources.ts';

export interface LiveCameraSources {
    /** Every camera declared by the active hardware config. */
    sources: StreamSource[];
    /** Cameras whose topic currently has a publisher. */
    liveSources: StreamSource[];
    /** Topics with a live publisher, or `null` while availability is unknown. */
    availableTopics: Set<string> | null;
    /** Whether a stream can be shown at all — false only when we *know* nothing is publishing */
    hasLiveCamera: boolean;
}

/** Cameras of the active config, crossed with which ones actually publish. */
export function useLiveCameraSources(): LiveCameraSources {
    const sources = useStreamSources();
    const { isConnected } = useRosConnection();
    const topics = useMemo(() => sources.map((s) => s.topic), [sources]);
    const availableTopics = useAvailableTopics(topics, isConnected);

    return useMemo(() => {
        const liveSources = availableTopics === null
            ? sources
            : sources.filter((s) => availableTopics.has(s.topic));
        return {
            sources,
            liveSources,
            availableTopics,
            hasLiveCamera: liveSources.length > 0,
        };
    }, [sources, availableTopics]);
}
