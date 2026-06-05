import { Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
    cellOutlineStyle,
    cellTooltipText,
    type OutlineBorderSet,
} from '../../../Utils/hardwareConfigServerErrors.ts';
import type { BoardRow } from '../types.ts';
import { boardOpts, boardRowOpts } from '../model/documentHelpers.ts';

const { Text } = Typography;

export function buildBoardColumns(
    serverFieldErrors: Map<string, string[]>,
    outlineBorders: OutlineBorderSet,
): ColumnsType<BoardRow> {
    return [
        {
            title: 'BOARD',
            dataIndex: 'boardId',
            key: 'boardId',
            render: (t: string, r: BoardRow) => (
                <span
                    style={cellOutlineStyle(serverFieldErrors, boardRowOpts(r.boardId), outlineBorders)}
                    title={cellTooltipText(serverFieldErrors, boardRowOpts(r.boardId))}
                >
                    <Text code>{t}</Text>
                </span>
            ),
        },
        {
            title: 'SERIAL_ID',
            dataIndex: 'serial_id',
            key: 'serial_id',
            render: (v: string, r: BoardRow) => (
                <span
                    style={cellOutlineStyle(serverFieldErrors, boardOpts(r.boardId, 'serial_id'), outlineBorders)}
                    title={cellTooltipText(serverFieldErrors, boardOpts(r.boardId, 'serial_id'))}
                >
                    {v}
                </span>
            ),
        },
        {
            title: 'BOARD_CLASS',
            dataIndex: 'board_class',
            key: 'board_class',
            render: (v: string, r: BoardRow) => (
                <span
                    style={cellOutlineStyle(serverFieldErrors, boardOpts(r.boardId, 'board_class'), outlineBorders)}
                    title={cellTooltipText(serverFieldErrors, boardOpts(r.boardId, 'board_class'))}
                >
                    {v}
                </span>
            ),
        },
        {
            title: 'PINS ATTACHED',
            dataIndex: 'attachedPins',
            key: 'attachedPins',
            width: 120,
            align: 'right',
            render: (n: number, r: BoardRow) => (
                <Text
                    style={{ fontFamily: 'monospace' }}
                    title="Physical pins 1..internal_actuator_slots claimed by actuators or sensors on this board"
                >
                    {n}
                    {r.internalActuatorSlots > 0 ? (
                        <Text type="secondary" style={{ marginLeft: 4 }}>
                            / {r.internalActuatorSlots}
                        </Text>
                    ) : null}
                </Text>
            ),
        },
        {
            title: 'FIRMWARE_TARGET',
            dataIndex: 'firmware_target',
            key: 'firmware_target',
            render: (v: string, r: BoardRow) => (
                <span
                    style={cellOutlineStyle(serverFieldErrors, boardOpts(r.boardId, 'firmware_target'), outlineBorders)}
                    title={cellTooltipText(serverFieldErrors, boardOpts(r.boardId, 'firmware_target'))}
                >
                    {v}
                </span>
            ),
        },
    ];
}
