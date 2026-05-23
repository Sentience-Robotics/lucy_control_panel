import { DeleteOutlined } from '@ant-design/icons';
import { Button, InputNumber, Popconfirm, Select, Switch, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
    cellOutlineStyle,
    cellTooltipText,
    type OutlineBorderSet,
} from '../../../Utils/hardwareConfigServerErrors.ts';
import type { PressureSensorTableRecord } from '../types.ts';
import {
    boardSlots,
    physicalPinOptions,
    sensOpts,
    usedPhysicalPinsOnBoardExcluding,
} from '../model/documentHelpers.ts';

const { Text } = Typography;

export type PressureSensorColumnsArgs = {
    yamlDoc: Record<string, unknown> | null;
    serverFieldErrors: Map<string, string[]>;
    outlineBorders: OutlineBorderSet;
    patchDoc: (next: Record<string, unknown>) => void;
    deletePressureSensorAt: (index: number) => void;
};

export function buildPressureSensorColumns({
    yamlDoc,
    serverFieldErrors,
    outlineBorders,
    patchDoc,
    deletePressureSensorAt,
}: PressureSensorColumnsArgs): ColumnsType<PressureSensorTableRecord> {
    return [
        {
            title: 'ID',
            key: 'id',
            width: 180,
            render: (_: unknown, record: PressureSensorTableRecord) => {
                const id = String(record.row.id ?? record.index);
                const so = sensOpts(id, 'id');
                return (
                    <span
                        style={cellOutlineStyle(serverFieldErrors, so, outlineBorders)}
                        title={cellTooltipText(serverFieldErrors, so)}
                    >
                        <Text code>{String(record.row.id ?? '')}</Text>
                    </span>
                );
            },
        },
        {
            title: 'ACTUATOR',
            key: 'aa',
            width: 160,
            render: (_: unknown, record: PressureSensorTableRecord) => {
                const id = String(record.row.id ?? record.index);
                const so = sensOpts(id, 'associated_actuator');
                return (
                    <span
                        style={cellOutlineStyle(serverFieldErrors, so, outlineBorders)}
                        title={cellTooltipText(serverFieldErrors, so)}
                    >
                        {String(record.row.associated_actuator ?? '')}
                    </span>
                );
            },
        },
        {
            title: 'BOARD',
            key: 'board',
            width: 140,
            render: (_: unknown, record: PressureSensorTableRecord) => {
                const id = String(record.row.id ?? record.index);
                const so = sensOpts(id, 'board');
                return (
                    <span
                        style={cellOutlineStyle(serverFieldErrors, so, outlineBorders)}
                        title={cellTooltipText(serverFieldErrors, so)}
                    >
                        {String(record.row.board ?? '')}
                    </span>
                );
            },
        },
        {
            title: 'V.PIN',
            key: 'vp',
            width: 70,
            render: (_: unknown, record: PressureSensorTableRecord) => {
                const id = String(record.row.id ?? record.index);
                const so = sensOpts(id, 'virtual_pin');
                return (
                    <span
                        style={cellOutlineStyle(serverFieldErrors, so, outlineBorders)}
                        title={cellTooltipText(serverFieldErrors, so)}
                    >
                        {String(record.row.virtual_pin ?? '')}
                    </span>
                );
            },
        },
        {
            title: 'PHYSICAL_PIN',
            key: 'physical_pin',
            width: 110,
            render: (_: unknown, record: PressureSensorTableRecord) => {
                const { row, index } = record;
                const id = String(row.id ?? index);
                const bid = String(row.board ?? '');
                const slots = yamlDoc ? boardSlots(yamlDoc, bid) : 0;
                const so = sensOpts(id, 'physical_pin');
                const usedPhys =
                    yamlDoc && bid ? usedPhysicalPinsOnBoardExcluding(yamlDoc, bid, { sensorIndex: index }) : new Set<number>();
                const curPhys = Number(row.physical_pin);
                const opts = physicalPinOptions(slots, usedPhys, curPhys);
                return (
                    <div title={cellTooltipText(serverFieldErrors, so)}>
                        <Select
                            size="small"
                            style={{
                                width: '100%',
                                ...cellOutlineStyle(serverFieldErrors, so, outlineBorders),
                            }}
                            value={Number.isFinite(curPhys) && opts.includes(curPhys) ? curPhys : opts[0]}
                            placeholder={slots ? undefined : '—'}
                            options={opts.map((p) => ({ value: p, label: String(p) }))}
                            onChange={(physVal) => {
                                if (!yamlDoc) return;
                                const next = structuredClone(yamlDoc);
                                const list = next.sensors as Record<string, unknown>[];
                                list[index] = { ...list[index], physical_pin: physVal };
                                patchDoc(next);
                            }}
                        />
                    </div>
                );
            },
        },
        {
            title: 'MIN_VALUE',
            key: 'minv',
            width: 110,
            render: (_: unknown, record: PressureSensorTableRecord) => {
                const { row, index } = record;
                const id = String(row.id ?? index);
                const raw = row.min_value;
                const so = sensOpts(id, 'min_value');
                return (
                    <InputNumber
                        size="small"
                        style={{ width: '100%', ...cellOutlineStyle(serverFieldErrors, so, outlineBorders) }}
                        value={raw === null || raw === undefined ? null : Number(raw)}
                        title={cellTooltipText(serverFieldErrors, so)}
                        onChange={(val) => {
                            if (!yamlDoc) return;
                            const next = structuredClone(yamlDoc);
                            const list = next.sensors as Record<string, unknown>[];
                            list[index] = { ...list[index], min_value: val === null ? null : val };
                            patchDoc(next);
                        }}
                    />
                );
            },
        },
        {
            title: 'MAX_VALUE',
            key: 'maxv',
            width: 110,
            render: (_: unknown, record: PressureSensorTableRecord) => {
                const { row, index } = record;
                const id = String(row.id ?? index);
                const raw = row.max_value;
                const so = sensOpts(id, 'max_value');
                return (
                    <InputNumber
                        size="small"
                        style={{ width: '100%', ...cellOutlineStyle(serverFieldErrors, so, outlineBorders) }}
                        value={raw === null || raw === undefined ? null : Number(raw)}
                        title={cellTooltipText(serverFieldErrors, so)}
                        onChange={(val) => {
                            if (!yamlDoc) return;
                            const next = structuredClone(yamlDoc);
                            const list = next.sensors as Record<string, unknown>[];
                            list[index] = { ...list[index], max_value: val === null ? null : val };
                            patchDoc(next);
                        }}
                    />
                );
            },
        },
        {
            title: 'ENABLED',
            key: 'en',
            width: 90,
            render: (_: unknown, record: PressureSensorTableRecord) => {
                const { row, index } = record;
                const id = String(row.id ?? index);
                const so = sensOpts(id, 'enabled');
                return (
                    <span
                        style={cellOutlineStyle(serverFieldErrors, so, outlineBorders)}
                        title={cellTooltipText(serverFieldErrors, so)}
                    >
                        <Switch
                            className="hardware-config-ant-switch"
                            checked={Boolean(row.enabled)}
                            onChange={(checked) => {
                                if (!yamlDoc) return;
                                const next = structuredClone(yamlDoc);
                                const list = next.sensors as Record<string, unknown>[];
                                list[index] = { ...list[index], enabled: checked };
                                patchDoc(next);
                            }}
                        />
                    </span>
                );
            },
        },
        {
            title: '',
            key: 'del_sensor',
            fixed: 'right' as const,
            width: 44,
            render: (_: unknown, record: PressureSensorTableRecord) => (
                <Popconfirm
                    title="REMOVE PRESSURE SENSOR?"
                    description="DELETES THIS SENSOR ROW AND RENUMBERS SENSOR VIRTUAL PINS ON THE BOARD."
                    okText="REMOVE"
                    cancelText="CANCEL"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => deletePressureSensorAt(record.index)}
                >
                    <Button type="text" size="small" danger icon={<DeleteOutlined />} aria-label="Remove pressure sensor" />
                </Popconfirm>
            ),
        },
    ];
}
