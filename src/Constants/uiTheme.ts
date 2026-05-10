/**
 * Single palette for the Lucy control panel — prefer importing from here instead of raw hex/rgb.
 * CSS files that cannot import TS use `var(--ui-*)` values applied via {@link mountUiThemeCssVars}.
 */

export const UI_ACCENT_GREEN = '#00ff41';
/** Matches `UI_ACCENT_GREEN` for `rgba(...)` in global CSS. */
export const UI_ACCENT_RGB = '0, 255, 65';

export function uiAccentRgba(alpha: number): string {
    return `rgba(${UI_ACCENT_RGB}, ${alpha})`;
}

/** Matches `UI_ERROR_RED` (#ff4d4f) for rgba overlays. */
export const UI_ERROR_RGB = '255, 77, 79';

export function uiErrorRgba(alpha: number): string {
    return `rgba(${UI_ERROR_RGB}, ${alpha})`;
}

export const UI_PANEL_BG = '#0a0a0a';
export const UI_BG_BLACK = '#000000';
export const UI_INPUT_SURFACE = '#1a1a1a';
export const UI_BORDER_MUTED = '#333333';
export const UI_BORDER_STRONG = '#333333';
export const UI_BORDER_SOFT = '#444444';
export const UI_BORDER_DIM = '#222222';
export const UI_TEXT_ON_ACCENT = '#000000';
export const UI_TEXT_PRIMARY_ON_DARK = '#ffffff';
export const UI_TEXT_SECONDARY_MUTED = '#666666';
/** Muted labels / secondary lines (Ant `colorTextSecondary` parity). */
export const UI_TEXT_SUBTLE = '#888888';
export const UI_ERROR_RED = '#ff4d4f';
export const UI_WARNING_AMBER = '#faad14';
/** Connecting / highlight orange (ROS bridge, stream chrome). */
export const UI_ACCENT_ORANGE = '#ffa500';
/** Decorative accent on NotFound — not the primary semantic error color. */
export const UI_DECORATIVE_CORAL = '#ff6b6b';

export const UI_LIST_ROW_BG = '#0c0c0c';
export const UI_CHROME_SURFACE = '#0d0d0d';
export const UI_MODAL_SURFACE = '#0b0b0b';
export const UI_MODAL_HEADER_TOP = '#121212';
export const UI_TOGGLE_TRACK_BORDER = '#2a2a2a';

/** Disabled hardware-config “add” buttons / switch track fallback. */
export const UI_SWITCH_DISABLED_BG = '#555555';
export const UI_SWITCH_DISABLED_BORDER = '#666666';

export const UI_MODAL_MASK_BG = 'rgba(0, 0, 0, 0.8)';
export const UI_NAV_BAR_BG = 'rgba(10, 10, 10, 0.9)';
export const UI_OVERLAY_BACKDROP_SOFT = 'rgba(0, 0, 0, 0.6)';
export const UI_SHADOW_ELEVATED = '0 8px 24px rgba(0, 0, 0, 0.6)';

export const UI_COLOR_TRANSPARENT = 'transparent';

/** Mediapipe / canvas drawing (distinct from UI accent for visibility). */
export const UI_CANVAS_LIME = '#00ff00';
export const UI_CANVAS_RED = '#ff0000';
/** Index fingertip marker on hand-tracking canvas. */
export const UI_VIDEO_OVERLAY_CYAN = '#00ffff';

/** Auth card alert tint (invalid credentials). */
export const UI_AUTH_ALERT_SURFACE = '#1a0a0a';

/** Ant Design `Tag` presets */
export const UI_TAG_ACTIVE_PRESET = 'cyan' as const;
export const UI_TAG_TARGET_PRESET = 'orange' as const;
export const UI_TAG_FLASHED_PRESET = 'purple' as const;
export const UI_TAG_LOADED_PRESET = 'blue' as const;

export const UI_ACCENT_TEXT_SHADOW = `0 0 10px ${UI_ACCENT_GREEN}`;
export const UI_ACCENT_BOX_SHADOW_SOFT = `0 0 8px ${UI_ACCENT_GREEN}`;
export const UI_ACCENT_BOX_SHADOW_STRONG = `0 0 10px ${UI_ACCENT_GREEN}`;
export const UI_PAGE_HEADER_BORDER_BOTTOM = `2px solid ${UI_BORDER_MUTED}`;

export const UI_CARD_SURFACE_STYLE = {
    background: UI_PANEL_BG,
    borderColor: UI_BORDER_MUTED,
} as const;

export const UI_PRIMARY_GREEN_BUTTON_STYLE = {
    backgroundColor: UI_ACCENT_GREEN,
    borderColor: UI_ACCENT_GREEN,
    color: UI_TEXT_ON_ACCENT,
} as const;

export const UI_GRADIENT_AUTH_PAGE = `linear-gradient(135deg, ${UI_BG_BLACK} 0%, ${UI_PANEL_BG} 100%)`;
export const UI_GRADIENT_MODAL_HEADER = `linear-gradient(180deg, ${UI_MODAL_HEADER_TOP}, ${UI_MODAL_SURFACE})`;

const UI_THEME_CSS_VARS: Record<string, string> = {
    '--ui-accent-green': UI_ACCENT_GREEN,
    '--ui-text-on-accent': UI_TEXT_ON_ACCENT,
    '--ui-switch-disabled-bg': UI_SWITCH_DISABLED_BG,
    '--ui-switch-disabled-border': UI_SWITCH_DISABLED_BORDER,
};

/** Call once at startup so `.css` files can use `var(--ui-*)`. */
export function mountUiThemeCssVars(): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    for (const [key, value] of Object.entries(UI_THEME_CSS_VARS)) {
        root.style.setProperty(key, value);
    }
}
