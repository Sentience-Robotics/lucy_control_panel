/*
 * Copyright 2025-2026 Sentience Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { createContext } from 'react';

/** Live height (px) of the sticky page header, for content that needs to pin below it. */
export const HeaderHeightContext = createContext(0);
