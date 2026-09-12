/*
 * Copyright 2025-2026 Sentience Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useMemo } from 'react';
import type { StreamSource } from '../Constants/rosConfig';
import { useActiveHardwareRos } from '../contexts/ActiveHardwareRosContext';
import { streamSourcesFromHardwareYaml } from '../Utils/streamSourcesFromHardwareYaml';

/** Stream picker entries: cameras declared by the active hardware config. */
export function useStreamSources(): StreamSource[] {
    const { activeHardwareDoc, activeHardwareFetchEpoch } = useActiveHardwareRos();

    return useMemo(() => {
        return activeHardwareDoc ? streamSourcesFromHardwareYaml(activeHardwareDoc) : [];
        // activeHardwareFetchEpoch: rebuild when pipeline activates a new preset.
    }, [activeHardwareDoc, activeHardwareFetchEpoch]);
}
