import { useEffect, useState } from 'react';
import { Button, Tooltip, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import {
    Diagnostics,
    type PipelineId,
    type Stage,
    type StageStatus,
} from '../Services/diagnostics.service';
import { PIPELINE_PROBES } from '../Services/pipelineProbes';
import {
    UI_ACCENT_GREEN,
    UI_BORDER_DIM,
    UI_ERROR,
    UI_LIST_ROW_BG,
    UI_TEXT_PRIMARY_ON_DARK,
    UI_TEXT_SUBTLE,
    UI_WARNING,
} from '../Constants/uiTheme';

const { Text } = Typography;

const STATUS_COLOR: Record<StageStatus, string> = {
    ok: UI_ACCENT_GREEN,
    warn: UI_WARNING,
    error: UI_ERROR,
    pending: UI_TEXT_SUBTLE,
};

const STATUS_GLYPH: Record<StageStatus, string> = {
    ok: '●',
    warn: '▲',
    error: '✕',
    pending: '○',
};

/** Higher wins when collapsing a pipeline into a single headline dot. */
const STATUS_SEVERITY: Record<StageStatus, number> = {
    ok: 0,
    pending: 1,
    warn: 2,
    error: 3,
};

function ago(at?: number): string {
    if (!at) return '';
    const seconds = Math.round((Date.now() - at) / 1000);
    if (seconds < 1) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    return `${Math.round(seconds / 60)}m ago`;
}

/** Re-render on every diagnostics update, plus a tick so "ago" stays honest. */
function useDiagnosticsTick(): number {
    const [tick, setTick] = useState(0);
    useEffect(() => {
        const bump = () => setTick((t) => t + 1);
        const unsubscribe = Diagnostics.subscribe(bump);
        const timer = setInterval(bump, 1000);
        return () => {
            unsubscribe();
            clearInterval(timer);
        };
    }, []);
    return tick;
}

/**
 * One stage, compressed to a glyph and a short label.
 *
 * Everything the old modal row showed inline - full name, hint, latest
 * observation, message count, age - moves into the tooltip. It opens on tap as
 * well as hover so the detail is reachable without a mouse.
 */
function StageChip({ stage }: { stage: Stage }) {
    const color = STATUS_COLOR[stage.status];
    return (
        <Tooltip
            trigger={['hover', 'click']}
            zIndex={1100}
            title={
                <div style={{ fontSize: 12 }}>
                    <div style={{ fontWeight: 600 }}>{stage.label}</div>
                    <div style={{ opacity: 0.85, marginTop: 2 }}>{stage.hint}</div>
                    {stage.detail && (
                        <div
                            style={{
                                fontFamily: 'monospace',
                                marginTop: 4,
                                wordBreak: 'break-word',
                            }}
                        >
                            {stage.detail}
                        </div>
                    )}
                    <div style={{ opacity: 0.7, marginTop: 4 }}>
                        {stage.count != null ? `${stage.count} msg · ` : ''}
                        {ago(stage.at) || 'nothing recorded yet'}
                    </div>
                </div>
            }
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '5px 8px',
                    background: UI_LIST_ROW_BG,
                    border: `1px solid ${UI_BORDER_DIM}`,
                    borderRadius: 6,
                    cursor: 'pointer',
                    minWidth: 0,
                }}
            >
                <span style={{ color, fontSize: 11, lineHeight: 1 }}>
                    {STATUS_GLYPH[stage.status]}
                </span>
                <span
                    style={{
                        color: UI_TEXT_PRIMARY_ON_DARK,
                        fontSize: 11,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {stage.short}
                </span>
            </div>
        </Tooltip>
    );
}

/**
 * A pipeline as a fixed 3x2 grid, reading left to right.
 *
 * The columns are fixed rather than wrapped so the six stages stay two lines at
 * every width instead of stacking into six on a phone; the labels ellipsise and
 * the tooltip carries the rest.
 */
export function PipelineDiagnostics({ pipeline, title }: { pipeline: PipelineId; title: string }) {
    useDiagnosticsTick();
    const [busy, setBusy] = useState(false);
    const stages = Diagnostics.getStages(pipeline);

    const worst = stages.reduce<StageStatus>(
        (acc, s) => (STATUS_SEVERITY[s.status] > STATUS_SEVERITY[acc] ? s.status : acc),
        'ok',
    );

    const refresh = async () => {
        setBusy(true);
        try {
            await PIPELINE_PROBES[pipeline]();
        } finally {
            setBusy(false);
        }
    };

    return (
        <div style={{ marginBottom: 10 }}>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 6,
                }}
            >
                <span style={{ color: STATUS_COLOR[worst], fontSize: 11, lineHeight: 1 }}>
                    {STATUS_GLYPH[worst]}
                </span>
                <Text style={{ color: UI_TEXT_PRIMARY_ON_DARK, fontSize: 12 }}>{title}</Text>
                <Tooltip title="Re-run the live checks for this pipeline" zIndex={1100}>
                    <Button
                        size="small"
                        type="text"
                        icon={<ReloadOutlined style={{ color: UI_TEXT_SUBTLE }} />}
                        loading={busy}
                        onClick={refresh}
                        style={{ marginLeft: 'auto' }}
                    />
                </Tooltip>
            </div>
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                    gap: 6,
                }}
            >
                {stages.map((stage) => (
                    <StageChip key={stage.id} stage={stage} />
                ))}
            </div>
        </div>
    );
}
