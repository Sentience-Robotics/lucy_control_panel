/*
 * Copyright 2025-2026 Sentience Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { UiThemeProvider } from './contexts/UiThemeContext.tsx'

const rootElement = document.getElementById('root');

const root = createRoot(rootElement as HTMLElement);
root.render(
    <StrictMode>
        <UiThemeProvider>
            <App />
        </UiThemeProvider>
    </StrictMode>
);
