import type { RefObject } from 'react';
import { useMemo } from 'react';
import {
    flattenServerErrors,
    GENERAL_VALIDATION_KEY,
    UNPARSED_VALIDATION_KEY,
} from '../../../Utils/hardwareConfigServerErrors.ts';
import { hardwareOutlineBorders } from '../model/outline.ts';
import { buildActuatorColumns } from '../tables/actuatorColumns.tsx';
import { buildBoardColumns } from '../tables/boardColumns.tsx';
import { buildPressureSensorColumns } from '../tables/pressureSensorColumns.tsx';

export interface HardwareConfigEditorColumnsParams {
    yamlDoc: Record<string, unknown> | null;
    serverFieldErrors: Map<string, string[]>;
    assignableUrdfJoints: string[];
    patchDoc: (next: Record<string, unknown>) => void;
    actuatorIdOnFocusRef: RefObject<Record<number, string>>;
    deleteActuatorAt: (index: number) => void;
    deletePressureSensorAt: (index: number) => void;
}

export function useHardwareConfigEditorColumns({
    yamlDoc,
    serverFieldErrors,
    assignableUrdfJoints,
    patchDoc,
    actuatorIdOnFocusRef,
    deleteActuatorAt,
    deletePressureSensorAt,
}: HardwareConfigEditorColumnsParams) {
    const outlineBorders = useMemo(() => hardwareOutlineBorders(), []);

    const serverErrorRows = useMemo(() => {
        const rows = flattenServerErrors(serverFieldErrors);
        const rank = (f: string) =>
            f === UNPARSED_VALIDATION_KEY ? 0 : f === GENERAL_VALIDATION_KEY ? 1 : 2;
        return [...rows].sort((a, b) => rank(a.field) - rank(b.field) || a.field.localeCompare(b.field));
    }, [serverFieldErrors]);

    const boardColumns = useMemo(
        () => buildBoardColumns(serverFieldErrors, outlineBorders),
        [serverFieldErrors, outlineBorders],
    );

    const actuatorColumns = useMemo(
        () =>
            buildActuatorColumns({
                yamlDoc,
                serverFieldErrors,
                outlineBorders,
                assignableUrdfJoints,
                patchDoc,
                actuatorIdOnFocusRef,
                deleteActuatorAt,
            }),
        [
            yamlDoc,
            serverFieldErrors,
            outlineBorders,
            assignableUrdfJoints,
            patchDoc,
            actuatorIdOnFocusRef,
            deleteActuatorAt,
        ],
    );

    const pressureSensorColumns = useMemo(
        () =>
            buildPressureSensorColumns({
                yamlDoc,
                serverFieldErrors,
                outlineBorders,
                patchDoc,
                deletePressureSensorAt,
            }),
        [yamlDoc, serverFieldErrors, outlineBorders, patchDoc, deletePressureSensorAt],
    );

    return { serverErrorRows, boardColumns, actuatorColumns, pressureSensorColumns };
}
