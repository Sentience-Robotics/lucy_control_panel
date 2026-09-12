/*
 * Copyright 2025-2026 Sentience Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/** Run async thunks with a fixed worker pool, resolving once all have settled. */
export async function runWithConcurrency(
    tasks: Array<() => Promise<void>>,
    limit: number,
): Promise<void> {
    let next = 0;
    const worker = async () => {
        while (next < tasks.length) {
            await tasks[next++]();
        }
    };
    await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
}
