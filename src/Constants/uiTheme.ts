/** Shared terminal / Lucy panel palette (hex). */

export const UI_ACCENT_GREEN = '#00ff41';
/** Matches `UI_ACCENT_GREEN` (#00ff41) for `rgba(...)` in global CSS. */
export const UI_ACCENT_RGB = '0, 255, 65';

export function uiAccentRgba(alpha: number): string {
    return `rgba(${UI_ACCENT_RGB}, ${alpha})`;
}

export const UI_PANEL_BG = '#0a0a0a';
export const UI_BG_BLACK = '#000000';
/** Inputs and inset surfaces */
export const UI_INPUT_SURFACE = '#1a1a1a';
/** Divider and card borders */
export const UI_BORDER_MUTED = '#333';
/** Ant Design token parity (`#333333`) */
export const UI_BORDER_STRONG = '#333333';
export const UI_BORDER_SOFT = '#444';
export const UI_TEXT_ON_ACCENT = '#000';
export const UI_TEXT_PRIMARY_ON_DARK = '#ffffff';
export const UI_TEXT_SECONDARY_MUTED = '#666666';
export const UI_ERROR_RED = '#ff4d4f';
export const UI_WARNING_AMBER = '#faad14';

export const UI_ACCENT_TEXT_SHADOW = `0 0 10px ${UI_ACCENT_GREEN}`;
export const UI_ACCENT_BOX_SHADOW_SOFT = `0 0 8px ${UI_ACCENT_GREEN}`;
export const UI_ACCENT_BOX_SHADOW_STRONG = `0 0 10px ${UI_ACCENT_GREEN}`;
export const UI_PAGE_HEADER_BORDER_BOTTOM = `2px solid ${UI_BORDER_MUTED}`;

/** Dark inset panels (Cards, modals). */
export const UI_CARD_SURFACE_STYLE = {
    background: UI_PANEL_BG,
    borderColor: UI_BORDER_MUTED,
} as const;

/** Primary “terminal green” action button (dark bg apps). */
export const UI_PRIMARY_GREEN_BUTTON_STYLE = {
    backgroundColor: UI_ACCENT_GREEN,
    borderColor: UI_ACCENT_GREEN,
    color: UI_TEXT_ON_ACCENT,
} as const;
