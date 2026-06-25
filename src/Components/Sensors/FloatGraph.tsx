import React, { useRef } from 'react';
import { Button } from 'antd';
import { UI_ACCENT_GREEN, UI_BG_BLACK, UI_BORDER_SOFT } from '../../Constants/uiTheme';
import type { SensorSample } from '../../hooks/useSensorStream';

interface FloatGraphProps {
    sourceName: string;
    topic?: string;
    samples: SensorSample[];
    currentValue: number | null;
    yAxisMin: number | null;
    yAxisMax: number | null;
    isPaused: boolean;
    onPausedChange: (paused: boolean) => void;
}

function resolveYAxisBounds(
    historicalMin: number | null,
    historicalMax: number | null,
): { minValue: number; maxValue: number } {
    if (historicalMin === null || historicalMax === null) {
        return { minValue: 0, maxValue: 100 };
    }
    if (historicalMin === historicalMax) {
        const pad = Math.max(Math.abs(historicalMin) * 0.1, 1);
        return { minValue: historicalMin - pad, maxValue: historicalMax + pad };
    }
    const pad = (historicalMax - historicalMin) * 0.05;
    return { minValue: historicalMin - pad, maxValue: historicalMax + pad };
}

export const FloatGraph: React.FC<FloatGraphProps> = ({
    sourceName,
    topic,
    samples,
    currentValue,
    yAxisMin,
    yAxisMax,
    isPaused,
    onPausedChange,
}) => {
    const graphRef = useRef<HTMLDivElement>(null);
    const { minValue, maxValue } = resolveYAxisBounds(yAxisMin, yAxisMax);

    const renderGraph = () => {
        const width = graphRef.current?.clientWidth || 300;
        const height = 280;
        const paddingLeft = 36;
        const paddingRight = 88;
        const paddingY = 20;

        const now = Date.now();
        const minTime = now - 60_000;
        const maxTime = now;

        const mapX = (time: number) =>
            paddingLeft +
            ((time - minTime) / Math.max(maxTime - minTime, 1)) *
                (width - paddingLeft - paddingRight);
        const mapY = (val: number) =>
            height -
            paddingY -
            ((val - minValue) / Math.max(maxValue - minValue, 1)) *
                (height - paddingY * 2);

        const midValue = (minValue + maxValue) / 2;
        const latest = samples[samples.length - 1];

        const pathData =
            samples.length >= 2
                ? samples
                      .map((sample, index) => {
                          const x = mapX(sample.time);
                          const y = mapY(sample.value);
                          return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
                      })
                      .join(' ')
                : '';

        return (
            <svg width="100%" height={height} style={{ display: 'block' }}>
                <text
                    x={6}
                    y={paddingY + 4}
                    fill={UI_ACCENT_GREEN}
                    fontSize="10"
                    fontFamily="monospace"
                >
                    {maxValue.toFixed(1)}
                </text>
                <text
                    x={6}
                    y={height - paddingY + 4}
                    fill={UI_ACCENT_GREEN}
                    fontSize="10"
                    fontFamily="monospace"
                >
                    {minValue.toFixed(1)}
                </text>
                <line
                    x1={paddingLeft}
                    y1={mapY(midValue)}
                    x2={width - paddingRight}
                    y2={mapY(midValue)}
                    stroke={UI_BORDER_SOFT}
                    strokeDasharray="4"
                />
                <text
                    x={6}
                    y={mapY(midValue) + 4}
                    fill={UI_BORDER_SOFT}
                    fontSize="10"
                    fontFamily="monospace"
                >
                    {midValue.toFixed(1)}
                </text>

                {pathData ? (
                    <path d={pathData} fill="none" stroke={UI_ACCENT_GREEN} strokeWidth="2" />
                ) : null}

                {latest ? (
                    <>
                        <circle
                            cx={mapX(latest.time)}
                            cy={mapY(latest.value)}
                            r="4"
                            fill={UI_ACCENT_GREEN}
                        />
                        <text
                            x={mapX(latest.time) + 10}
                            y={mapY(latest.value) + 8}
                            fill={UI_ACCENT_GREEN}
                            fontSize="24"
                            fontFamily="monospace"
                            fontWeight="bold"
                        >
                            {latest.value.toFixed(0)}
                        </text>
                    </>
                ) : currentValue !== null ? (
                    <text
                        x={width - paddingRight + 4}
                        y={height / 2}
                        fill={UI_ACCENT_GREEN}
                        fontSize="24"
                        fontFamily="monospace"
                        fontWeight="bold"
                    >
                        {currentValue.toFixed(0)}
                    </text>
                ) : (
                    <text
                        x={paddingLeft}
                        y={height / 2}
                        fill={UI_BORDER_SOFT}
                        fontSize="12"
                        fontFamily="monospace"
                    >
                        Waiting for sensor data...
                    </text>
                )}
            </svg>
        );
    };

    return (
        <div className="tui-container" ref={graphRef}>
            <div
                style={{
                    marginBottom: '8px',
                    borderBottom: `1px solid ${UI_BORDER_SOFT}`,
                    paddingBottom: '4px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                }}
            >
                <div style={{ minWidth: 0 }}>
                    <span className="tui-text-success" style={{ fontWeight: 'bold' }}>
                        {sourceName}
                    </span>
                    {topic ? (
                        <div className="tui-text-muted" style={{ fontSize: '11px' }}>
                            {topic}
                        </div>
                    ) : null}
                </div>
                <div>
                    <span className="tui-text-muted" style={{ marginRight: '10px' }}>
                        {isPaused ? '[PAUSED]' : '[LIVE]'}
                    </span>
                    <Button size="small" onClick={() => onPausedChange(!isPaused)}>
                        {isPaused ? 'Resume' : 'Pause'}
                    </Button>
                </div>
            </div>
            <div
                style={{
                    height: '300px',
                    padding: '10px 0',
                    backgroundColor: UI_BG_BLACK,
                    overflow: 'hidden',
                }}
            >
                {renderGraph()}
            </div>
        </div>
    );
};
