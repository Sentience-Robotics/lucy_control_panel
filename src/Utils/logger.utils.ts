/*
 * Copyright 2025-2026 Sentience Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export const logger = (message: string) => {
    if (import.meta.env.VITE_ENABLE_LOGS === 'true') {
        console.log(message);
    }
}