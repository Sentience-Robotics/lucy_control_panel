import { UI_BORDER_MUTED, UI_ERROR, uiErrorRgba } from '../../../Constants/uiTheme.ts';
import type { OutlineBorderSet } from '../../../Utils/hardwareConfigServerErrors.ts';

export function hardwareOutlineBorders(): OutlineBorderSet {
    return {
        ok: `1px solid ${UI_BORDER_MUTED}`,
        exact: `1px solid ${UI_ERROR}`,
        row: `1px solid ${uiErrorRgba(0.45)}`,
    };
}
