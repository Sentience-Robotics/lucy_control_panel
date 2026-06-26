import { useMemo } from 'react';
import { useActiveHardwareRos } from '../contexts/ActiveHardwareRosContext';
import { sensorSourcesFromHardwareYaml } from '../Utils/sensorSourcesFromHardwareYaml';
import type { SensorSource } from '../Constants/rosConfig';

/** Pressure sensor stream entries from the active hardware config. */
export function useSensorSources(): SensorSource[] {
    const { activeHardwareDoc, activeHardwareFetchEpoch } = useActiveHardwareRos();

    return useMemo(() => {
        if (!activeHardwareDoc) return [];
        return sensorSourcesFromHardwareYaml(activeHardwareDoc);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- rebuild when pipeline activates a new preset
    }, [activeHardwareDoc, activeHardwareFetchEpoch]);
}
