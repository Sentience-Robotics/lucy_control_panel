/*
 * Copyright 2025-2026 Sentience Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from 'react';
import {
    DARK_THEME,
    LIGHT_THEME,
    type UiThemeTokens,
    _setActiveTheme,
    mountUiThemeCssVars,
} from '../Constants/uiTheme';

export type ThemeMode = 'dark' | 'light';

interface UiThemeContextValue {
    mode: ThemeMode;
    setMode: (mode: ThemeMode) => void;
    tokens: UiThemeTokens;
}

const UiThemeContext = createContext<UiThemeContextValue | undefined>(undefined);

const THEME_MODE_KEY = 'themeMode';

function getInitialMode(): ThemeMode {
    try {
        const stored = localStorage.getItem(THEME_MODE_KEY);
        if (stored === 'light' || stored === 'dark') return stored;
    } catch {
        // Privacy mode / disabled storage — fall through to default.
    }
    return 'dark';
}

function applyTheme(tokens: UiThemeTokens): void {
    _setActiveTheme(tokens);
    mountUiThemeCssVars(tokens);
    if (typeof document !== 'undefined') {
        document.body.style.backgroundColor = tokens.bgBase;
    }
}

const initialMode = getInitialMode();
applyTheme(initialMode === 'dark' ? DARK_THEME : LIGHT_THEME);

export function UiThemeProvider({ children }: { children: ReactNode }) {
    const [mode, setModeState] = useState<ThemeMode>(initialMode);
    const tokens = mode === 'dark' ? DARK_THEME : LIGHT_THEME;

    useLayoutEffect(() => {
        applyTheme(tokens);
    }, [tokens]);

    const setMode = (newMode: ThemeMode) => {
        try {
            localStorage.setItem(THEME_MODE_KEY, newMode);
        } catch (e) {
            console.warn('Theme preference not persisted:', e);
        }
        // Apply immediately so live exports update before child re-render.
        applyTheme(newMode === 'dark' ? DARK_THEME : LIGHT_THEME);
        setModeState(newMode);
    };

    return (
        <UiThemeContext.Provider value={{ mode, setMode, tokens }}>
            {children}
        </UiThemeContext.Provider>
    );
}

export function useUiTheme(): UiThemeContextValue {
    const ctx = useContext(UiThemeContext);
    if (!ctx) throw new Error('useUiTheme must be used within UiThemeProvider');
    return ctx;
}
