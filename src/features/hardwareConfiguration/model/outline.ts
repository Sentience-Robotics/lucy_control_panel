import { UI_BORDER_MUTED, UI_ERROR_RED } from '../../../Constants/uiTheme';
import type { OutlineBorderSet } from '../../../Utils/hardwareConfigServerErrors.ts';

export function hardwareOutlineBorders(): OutlineBorderSet {
    return {
        ok: `1px solid ${UI_BORDER_MUTED}`,
        exact: `1px solid ${UI_ERROR_RED}`,
        row: '1px solid rgba(255, 77, 79, 0.45)',
    };
}
