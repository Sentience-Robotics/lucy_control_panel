import { useMemo } from 'react';
import { STREAM_SOURCE_3D_VIEW, type StreamSource } from '../Constants/rosConfig';
import { useActiveHardwareRos } from '../contexts/ActiveHardwareRosContext';
import { streamSourcesFromHardwareYaml } from '../Utils/streamSourcesFromHardwareYaml';

/** Stream picker entries: cameras from active hardware config + virtual 3D view. */
export function useStreamSources(): StreamSource[] {
    const { activeHardwareDoc, activeHardwareFetchEpoch } = useActiveHardwareRos();

    return useMemo(() => {
        const cameras = activeHardwareDoc
            ? streamSourcesFromHardwareYaml(activeHardwareDoc)
            : [];
        return [...cameras, STREAM_SOURCE_3D_VIEW];
        // activeHardwareFetchEpoch: rebuild when pipeline activates a new preset.
    }, [activeHardwareDoc, activeHardwareFetchEpoch]);
}
