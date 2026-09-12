/*
 * Copyright 2025-2026 Sentience Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useEffect, useState } from 'react';
import { GazeboStatusHandler } from '../Services/ros/handlers/GazeboStatus.handler.ts';

/**
 * Reactive wrapper over `GazeboStatusHandler`.
 *
 * Returns the latest `/lucy/gazebo_running` value, or `null` while we have
 * not received a message yet (use the null state to avoid prompts based on
 * a stale assumption).
 */
export function useGazeboRunning(): boolean | null {
    const [value, setValue] = useState<boolean | null>(GazeboStatusHandler.getInstance().value);
    useEffect(() => {
        const off = GazeboStatusHandler.getInstance().subscribe(setValue);
        return off;
    }, []);
    return value;
}
