import type { MessageInstance } from 'antd/es/message/interface';
import { useCallback } from 'react';
import {
    asMapping,
    defaultNewActuatorRow,
    defaultNewPressureSensorRow,
    renormalizeSensorVirtualPinsOnBoard,
} from '../model/documentHelpers.ts';
import { appendPassiveUrdfJointIfUnassigned } from '../model/passiveUrdf.ts';

export interface HardwareConfigMutationsParams {
    yamlDoc: Record<string, unknown> | null;
    patchDoc: (next: Record<string, unknown>) => void;
    messageApi: MessageInstance;
    addActuatorBoard: string | undefined;
    addPressureSensorActuatorId: string | undefined;
}

export function useHardwareConfigMutations({
    yamlDoc,
    patchDoc,
    messageApi,
    addActuatorBoard,
    addPressureSensorActuatorId,
}: HardwareConfigMutationsParams) {
    const handleAddActuator = useCallback(() => {
        if (!yamlDoc || !addActuatorBoard) return;
        const row = defaultNewActuatorRow(yamlDoc, addActuatorBoard);
        if (!row) {
            messageApi.warning('No free physical pin on that board.');
            return;
        }
        const next = structuredClone(yamlDoc);
        if (!Array.isArray(next.actuators)) next.actuators = [];
        (next.actuators as Record<string, unknown>[]).push(row);
        patchDoc(next);
        messageApi.success(`Added actuator "${String(row.id)}"`);
    }, [yamlDoc, addActuatorBoard, patchDoc, messageApi]);

    const handleAddPressureSensor = useCallback(() => {
        if (!yamlDoc || !addPressureSensorActuatorId) return;
        const row = defaultNewPressureSensorRow(yamlDoc, addPressureSensorActuatorId);
        if (!row) {
            messageApi.warning('Could not add sensor — pick an actuator on a board with a free pin.');
            return;
        }
        const next = structuredClone(yamlDoc);
        if (!Array.isArray(next.sensors)) next.sensors = [];
        (next.sensors as Record<string, unknown>[]).push(row);
        patchDoc(next);
        messageApi.success(`Added pressure sensor "${String(row.id)}"`);
    }, [yamlDoc, addPressureSensorActuatorId, patchDoc, messageApi]);

    const deleteActuatorAt = useCallback(
        (index: number) => {
            if (!yamlDoc || !Array.isArray(yamlDoc.actuators)) return;
            const list = yamlDoc.actuators as Record<string, unknown>[];
            if (index < 0 || index >= list.length) return;
            const row = list[index];
            const aid = String(row?.id ?? '').trim();
            const removedJoint = String(row?.urdf_joint ?? '').trim();
            const next = structuredClone(yamlDoc);
            const actuators = next.actuators as Record<string, unknown>[];
            actuators.splice(index, 1);
            if (aid && Array.isArray(next.sensors)) {
                next.sensors = (next.sensors as Record<string, unknown>[]).filter(
                    (s) => String(s?.associated_actuator ?? '').trim() !== aid,
                );
            }
            appendPassiveUrdfJointIfUnassigned(next, removedJoint);
            patchDoc(next);
            messageApi.success('Actuator removed');
        },
        [yamlDoc, patchDoc, messageApi],
    );

    const deletePressureSensorAt = useCallback(
        (index: number) => {
            if (!yamlDoc || !Array.isArray(yamlDoc.sensors)) return;
            const list = yamlDoc.sensors as Record<string, unknown>[];
            if (index < 0 || index >= list.length) return;
            const row = asMapping(list[index]);
            if (!row || String(row.type ?? '').trim() !== 'pressure') {
                messageApi.warning('Can only remove pressure sensors from this table.');
                return;
            }
            const boardId = String(row.board ?? '').trim();
            const sid = String(row.id ?? '').trim();
            const next = structuredClone(yamlDoc);
            const sensors = next.sensors as Record<string, unknown>[];
            sensors.splice(index, 1);
            if (boardId) {
                renormalizeSensorVirtualPinsOnBoard(sensors, boardId);
            }
            patchDoc(next);
            messageApi.success(sid ? `Removed sensor "${sid}"` : 'Pressure sensor removed');
        },
        [yamlDoc, patchDoc, messageApi],
    );

    return {
        handleAddActuator,
        handleAddPressureSensor,
        deleteActuatorAt,
        deletePressureSensorAt,
    };
}
