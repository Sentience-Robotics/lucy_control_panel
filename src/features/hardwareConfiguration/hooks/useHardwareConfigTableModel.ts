import { useEffect, useMemo, useState } from 'react';
import {
    asMapping,
    assignableUrdfJointsFromYaml,
    boardSlots,
    freePhysicalPinsOnBoard,
    sortedBoardIds,
} from '../model/documentHelpers.ts';
import type { ActuatorTableRecord, BoardRow, PressureSensorTableRecord } from '../types.ts';

/**
 * Table row projections and “add actuator / sensor” dropdown options derived from the current YAML doc.
 */
export function useHardwareConfigTableModel(yamlDoc: Record<string, unknown> | null) {
    const [addPressureSensorActuatorId, setAddPressureSensorActuatorId] = useState<string | undefined>();
    const [actuatorSearchQuery, setActuatorSearchQuery] = useState('');

    const boardsEligibleForNewActuator = useMemo(() => {
        if (!yamlDoc) return [];
        return sortedBoardIds(yamlDoc).filter((bid) => freePhysicalPinsOnBoard(yamlDoc, bid).length > 0);
    }, [yamlDoc]);

    const actuatorsEligibleForNewPressureSensor = useMemo(() => {
        if (!yamlDoc || !Array.isArray(yamlDoc.actuators)) return [];
        const opts: { value: string; label: string }[] = [];
        for (const a of yamlDoc.actuators as Record<string, unknown>[]) {
            const m = asMapping(a);
            if (!m) continue;
            const id = String(m.id ?? '').trim();
            const boardId = String(m.board ?? '').trim();
            if (!id || !boardId) continue;
            if (freePhysicalPinsOnBoard(yamlDoc, boardId).length === 0) continue;
            opts.push({ value: id, label: `${id} (${boardId})` });
        }
        return opts;
    }, [yamlDoc]);

    useEffect(() => {
        setAddPressureSensorActuatorId((prev) =>
            prev && actuatorsEligibleForNewPressureSensor.some((o) => o.value === prev)
                ? prev
                : undefined,
        );
    }, [actuatorsEligibleForNewPressureSensor]);

    const boardRows: BoardRow[] = useMemo(() => {
        if (!yamlDoc) return [];
        const boards = asMapping(yamlDoc.boards);
        if (!boards) return [];
        return Object.keys(boards).map((boardId) => {
            const b = asMapping(boards[boardId]);
            const slots = boardSlots(yamlDoc, boardId);
            const freeList = freePhysicalPinsOnBoard(yamlDoc, boardId);
            const attachedPins = slots > 0 ? slots - freeList.length : 0;
            return {
                key: boardId,
                boardId,
                serial_id: b && typeof b.serial_id === 'string' ? b.serial_id : '',
                board_class: b && typeof b.board_class === 'string' ? b.board_class : '',
                firmware_target: b && typeof b.firmware_target === 'string' ? b.firmware_target : '',
                internalActuatorSlots: slots,
                attachedPins,
            };
        });
    }, [yamlDoc]);

    const actuatorRows: ActuatorTableRecord[] = useMemo(() => {
        if (!yamlDoc || !Array.isArray(yamlDoc.actuators)) return [];
        const allRows = yamlDoc.actuators.map((row, index) => ({
            key: `act-${index}`,
            index,
            row: asMapping(row) ?? {},
        }));
        if (!actuatorSearchQuery) {
            return allRows;
        }
        const query = actuatorSearchQuery.toLowerCase();
        return allRows.filter(({ row }) => {
            const name = String(row.name ?? '').toLowerCase();
            const id = String(row.id ?? '').toLowerCase();
            const joint = String(row.joint ?? '').toLowerCase();
            return name.includes(query) || id.includes(query) || joint.includes(query);
        });
    }, [yamlDoc, actuatorSearchQuery]);

    const pressureSensorRows: PressureSensorTableRecord[] = useMemo(() => {
        if (!yamlDoc || !Array.isArray(yamlDoc.sensors)) return [];
        const out: PressureSensorTableRecord[] = [];
        yamlDoc.sensors.forEach((row, index) => {
            const m = asMapping(row);
            if (m && m.type === 'pressure') {
                out.push({ key: `sensor-${index}`, index, row: m });
            }
        });
        return out;
    }, [yamlDoc]);

    const hardwareRobotName = useMemo(() => {
        if (!yamlDoc) return '';
        const v = yamlDoc.robot_name;
        return typeof v === 'string' ? v.trim() : '';
    }, [yamlDoc]);

    const assignableUrdfJoints = useMemo(
        () => (yamlDoc ? assignableUrdfJointsFromYaml(yamlDoc) : []),
        [yamlDoc],
    );

    return {
        boardsEligibleForNewActuator,
        actuatorsEligibleForNewPressureSensor,
        boardRows,
        actuatorRows,
        pressureSensorRows,
        hardwareRobotName,
        assignableUrdfJoints,
        addPressureSensorActuatorId,
        setAddPressureSensorActuatorId,
        actuatorSearchQuery,
        setActuatorSearchQuery,
    };
}
