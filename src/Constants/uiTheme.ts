/*
 * Copyright 2025-2026 Sentience Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/**
 * Theme tokens for the Lucy control panel.
 * CSS files use `var(--ui-*)` via {@link mountUiThemeCssVars}.
 * Color exports are live bindings updated by {@link _setActiveTheme}.
 */

export interface UiThemeTokens {
    bgBase: string;
    panelBg: string;
    inputBg: string;
    textPrimary: string;
    textSecondary: string;
    textOnAccent: string;
    border: string;
    borderSubtle: string;
    accentPrimary: string;
    errorColor: string;
    warningColor: string;
    navBarBg: string;
    borderRadius: number;
}

export const DARK_THEME: UiThemeTokens = {
    bgBase: '#000000',
    panelBg: '#0a0a0a',
    inputBg: '#1a1a1a',
    textPrimary: '#F7F1E5',
    textSecondary: '#888888',
    textOnAccent: '#000000',
    border: '#333333',
    borderSubtle: '#222222',
    accentPrimary: '#00ff41',
    errorColor: '#ff4d4f',
    warningColor: '#ffa500',
    navBarBg: 'rgba(10, 10, 10, 0.9)',
    borderRadius: 0,
};

export const LIGHT_THEME: UiThemeTokens = {
    bgBase: '#ffffff',
    panelBg: '#f5f5f5',
    inputBg: '#ffffff',
    textPrimary: '#141414',
    textSecondary: '#595959',
    textOnAccent: '#ffffff',
    border: '#d9d9d9',
    borderSubtle: '#f0f0f0',
    accentPrimary: '#087f23',
    errorColor: '#cf1322',
    warningColor: '#d46b08',
    navBarBg: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
};

let _activeTokens: UiThemeTokens = DARK_THEME;

/** @internal Applied by UiThemeProvider when mode changes. */
export function _setActiveTheme(tokens: UiThemeTokens): void {
    _activeTokens = tokens;
    const isDark = tokens.borderRadius === 0;

    UI_ACCENT_GREEN = tokens.accentPrimary;
    UI_ACCENT_RGB = hexToRgbCsv(tokens.accentPrimary);
    UI_ERROR_RGB = hexToRgbCsv(tokens.errorColor);
    UI_PANEL_BG = tokens.panelBg;
    UI_BG_BLACK = tokens.bgBase;
    UI_INPUT_SURFACE = tokens.inputBg;
    UI_BORDER_MUTED = tokens.border;
    UI_BORDER_STRONG = tokens.border;
    UI_BORDER_SOFT = isDark ? '#444444' : tokens.border;
    UI_BORDER_DIM = tokens.borderSubtle;
    UI_TEXT_ON_ACCENT = tokens.textOnAccent;
    UI_TEXT_PRIMARY_ON_DARK = tokens.textPrimary;
    UI_TEXT_SECONDARY_MUTED = isDark ? '#666666' : tokens.textSecondary;
    UI_TEXT_SUBTLE = tokens.textSecondary;
    UI_ERROR = tokens.errorColor;
    UI_WARNING = tokens.warningColor;
    UI_LIST_ROW_BG = isDark ? '#0c0c0c' : '#fafafa';
    UI_CHROME_SURFACE = isDark ? '#0d0d0d' : '#f0f0f0';
    UI_MODAL_SURFACE = isDark ? '#0b0b0b' : '#ffffff';
    UI_MODAL_HEADER_TOP = isDark ? '#121212' : '#f5f5f5';
    UI_TOGGLE_TRACK_BORDER = isDark ? '#2a2a2a' : tokens.border;
    UI_MODAL_MASK_BG = isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.45)';
    UI_NAV_BAR_BG = tokens.navBarBg;
    UI_OVERLAY_BACKDROP_SOFT = isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.35)';
    UI_SHADOW_ELEVATED = isDark ? '0 8px 24px rgba(0, 0, 0, 0.6)' : '0 2px 8px rgba(0, 0, 0, 0.15)';
    UI_AUTH_ALERT_SURFACE = isDark ? '#1a0a0a' : '#fff1f0';
    UI_ACCENT_TEXT_SHADOW = isDark ? `0 0 10px ${tokens.accentPrimary}` : 'none';
    UI_ACCENT_BOX_SHADOW_SOFT = isDark ? `0 0 8px ${tokens.accentPrimary}` : 'none';
    UI_ACCENT_BOX_SHADOW_STRONG = isDark ? `0 0 10px ${tokens.accentPrimary}` : 'none';
    UI_PAGE_HEADER_BORDER_BOTTOM = `2px solid ${tokens.border}`;
    UI_CARD_SURFACE_STYLE = {
        background: tokens.panelBg,
        borderColor: tokens.border,
    };
    UI_PRIMARY_GREEN_BUTTON_STYLE = {
        backgroundColor: tokens.accentPrimary,
        borderColor: tokens.accentPrimary,
        color: tokens.textOnAccent,
    };
    UI_GRADIENT_AUTH_PAGE = `linear-gradient(135deg, ${tokens.bgBase} 0%, ${tokens.panelBg} 100%)`;
    UI_GRADIENT_MODAL_HEADER = `linear-gradient(180deg, ${UI_MODAL_HEADER_TOP}, ${UI_MODAL_SURFACE})`;
}

function hexToRgbCsv(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r}, ${g}, ${b}`;
}

export function rgba(hex: string, alpha: number): string {
    return `rgba(${hexToRgbCsv(hex)}, ${alpha})`;
}

export function uiAccentRgba(alpha: number): string {
    return `rgba(${UI_ACCENT_RGB}, ${alpha})`;
}

export function uiErrorRgba(alpha: number): string {
    return `rgba(${UI_ERROR_RGB}, ${alpha})`;
}

export let UI_ACCENT_GREEN = DARK_THEME.accentPrimary;
export let UI_ACCENT_RGB = hexToRgbCsv(DARK_THEME.accentPrimary);
export let UI_ERROR_RGB = hexToRgbCsv(DARK_THEME.errorColor);

export let UI_PANEL_BG = DARK_THEME.panelBg;
export let UI_BG_BLACK = DARK_THEME.bgBase;
export let UI_INPUT_SURFACE = DARK_THEME.inputBg;
export let UI_BORDER_MUTED = DARK_THEME.border;
export let UI_BORDER_STRONG = DARK_THEME.border;
export let UI_BORDER_SOFT = '#444444';
export let UI_BORDER_DIM = DARK_THEME.borderSubtle;
export let UI_TEXT_ON_ACCENT = DARK_THEME.textOnAccent;
export let UI_TEXT_PRIMARY_ON_DARK = DARK_THEME.textPrimary;
export let UI_TEXT_SECONDARY_MUTED = '#666666';
export let UI_TEXT_SUBTLE = DARK_THEME.textSecondary;
export let UI_ERROR = DARK_THEME.errorColor;
export let UI_WARNING = DARK_THEME.warningColor;
export const UI_ACCENT_BLUE = '#00d9ff';
export const UI_DECORATIVE_CORAL = '#ff6b6b';

export let UI_LIST_ROW_BG = '#0c0c0c';
export let UI_CHROME_SURFACE = '#0d0d0d';
export let UI_MODAL_SURFACE = '#0b0b0b';
export let UI_MODAL_HEADER_TOP = '#121212';
export let UI_TOGGLE_TRACK_BORDER = '#2a2a2a';

export const UI_SWITCH_DISABLED_BG = '#555555';
export const UI_SWITCH_DISABLED_BORDER = '#666666';

export let UI_MODAL_MASK_BG = 'rgba(0, 0, 0, 0.8)';
export let UI_NAV_BAR_BG = DARK_THEME.navBarBg;
export let UI_OVERLAY_BACKDROP_SOFT = 'rgba(0, 0, 0, 0.6)';
export let UI_SHADOW_ELEVATED = '0 8px 24px rgba(0, 0, 0, 0.6)';

export const UI_COLOR_TRANSPARENT = 'transparent';

export const UI_CANVAS_LIME = '#00ff00';
export const UI_CANVAS_RED = '#ff0000';
export const UI_VIDEO_OVERLAY_CYAN = '#00ffff';

export let UI_AUTH_ALERT_SURFACE = '#1a0a0a';

export const UI_TAG_ACTIVE_PRESET = 'cyan' as const;
export const UI_TAG_TARGET_PRESET = 'orange' as const;
export const UI_TAG_FLASHED_PRESET = 'purple' as const;
export const UI_TAG_LOADED_PRESET = 'blue' as const;

export let UI_ACCENT_TEXT_SHADOW = `0 0 10px ${DARK_THEME.accentPrimary}`;
export let UI_ACCENT_BOX_SHADOW_SOFT = `0 0 8px ${DARK_THEME.accentPrimary}`;
export let UI_ACCENT_BOX_SHADOW_STRONG = `0 0 10px ${DARK_THEME.accentPrimary}`;
export let UI_PAGE_HEADER_BORDER_BOTTOM = `2px solid ${DARK_THEME.border}`;

export const PAGE_CONTENT_STYLE = {
    padding: 12,
    position: 'relative',
} as const;

export let UI_CARD_SURFACE_STYLE: { background: string; borderColor: string } = {
    background: DARK_THEME.panelBg,
    borderColor: DARK_THEME.border,
};

export let UI_PRIMARY_GREEN_BUTTON_STYLE: {
    backgroundColor: string;
    borderColor: string;
    color: string;
} = {
    backgroundColor: DARK_THEME.accentPrimary,
    borderColor: DARK_THEME.accentPrimary,
    color: DARK_THEME.textOnAccent,
};

export let UI_GRADIENT_AUTH_PAGE = `linear-gradient(135deg, ${DARK_THEME.bgBase} 0%, ${DARK_THEME.panelBg} 100%)`;
export let UI_GRADIENT_MODAL_HEADER = `linear-gradient(180deg, #121212, #0b0b0b)`;

/** Apply CSS vars + data-theme for stylesheet consumers. */
export function mountUiThemeCssVars(tokens: UiThemeTokens = _activeTokens): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.style.setProperty('--ui-accent-green', tokens.accentPrimary);
    root.style.setProperty('--ui-text-on-accent', tokens.textOnAccent);
    root.style.setProperty('--ui-bg-base', tokens.bgBase);
    root.style.setProperty('--ui-panel-bg', tokens.panelBg);
    root.style.setProperty('--ui-border', tokens.border);
    root.style.setProperty('--ui-border-subtle', tokens.borderSubtle);
    root.style.setProperty('--ui-border-radius', `${tokens.borderRadius}px`);
    root.style.setProperty('--ui-switch-disabled-bg', UI_SWITCH_DISABLED_BG);
    root.style.setProperty('--ui-switch-disabled-border', UI_SWITCH_DISABLED_BORDER);
    root.dataset.theme = tokens.borderRadius === 0 ? 'dark' : 'light';
}
