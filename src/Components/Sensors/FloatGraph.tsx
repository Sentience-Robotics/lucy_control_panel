import React, { useState, useEffect, useRef } from 'react';
import { Button } from 'antd';
import { UI_ACCENT_GREEN, UI_BG_BLACK, UI_BORDER_SOFT } from '../../Constants/uiTheme';

interface FloatGraphProps {
  dataSourceId: string;
  sourceName: string;
}

export const FloatGraph: React.FC<FloatGraphProps> = ({ dataSourceId, sourceName }) => {
    const [sourceData, setSourceData] = useState<{ time: number, value: number }[]>([]);
    const [displayData, setDisplayData] = useState<{ time: number, value: number }[]>([]);
    const [isPaused, setIsPaused] = useState(false);
    const graphRef = useRef<HTMLDivElement>(null);
  
    // Data source always runs in the background
    useEffect(() => {
      let startTime = Date.now();
      const interval = setInterval(() => {
        const now = Date.now();
        const timeElapsed = (now - startTime) / 1000;
        const value = 20 + Math.sin(timeElapsed) * 5 + (Math.random() * 2 - 1);
        
        setSourceData(prevData => {
            const newData = [...prevData, { time: now, value }];
            return newData.filter(d => now - d.time < 60000);
        });
      }, 1000);
  
      return () => clearInterval(interval);
    }, [dataSourceId]);

    // Sync display with source only when not paused
    useEffect(() => {
        if (!isPaused) {
            setDisplayData(sourceData);
        }
    }, [sourceData, isPaused]);
  
    // Simple SVG rendering
    const renderGraph = () => {
        if (displayData.length < 2) return null;

        const width = graphRef.current?.clientWidth || 300;
        const height = 280;
        const padding = 20;

        const now = Date.now();
        const minTime = now - 60000;
        const maxTime = now;

        const values = displayData.map(d => d.value);
        let minValue = Math.min(...values) - 2;
        let maxValue = Math.max(...values) + 2;
        
        if (minValue === maxValue) {
             minValue -= 10;
             maxValue += 10;
        }

        const mapX = (time: number) => padding + ((time - minTime) / (maxTime - minTime)) * (width - padding * 2);
        const mapY = (val: number) => height - padding - ((val - minValue) / (maxValue - minValue)) * (height - padding * 2);

        const pathData = displayData.map((d, i) => {
            const x = mapX(d.time);
            const y = mapY(d.value);
            return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
        }).join(' ');

        const midValue = (minValue + maxValue) / 2;

        return (
            <svg width="100%" height={height} style={{ display: 'block' }}>
                <text x={5} y={padding + 5} fill={UI_ACCENT_GREEN} fontSize="10" fontFamily="monospace">{maxValue.toFixed(1)}</text>
                <text x={5} y={height - padding + 5} fill={UI_ACCENT_GREEN} fontSize="10" fontFamily="monospace">{minValue.toFixed(1)}</text>
                <line x1={padding} y1={mapY(midValue)} x2={width - padding} y2={mapY(midValue)} stroke={UI_BORDER_SOFT} strokeDasharray="4" />
                <text x={5} y={mapY(midValue) + 5} fill={UI_BORDER_SOFT} fontSize="10" fontFamily="monospace">{midValue.toFixed(1)}</text>
                <path d={pathData} fill="none" stroke={UI_ACCENT_GREEN} strokeWidth="2" />
                {displayData.length > 0 && (
                    <circle cx={mapX(displayData[displayData.length - 1].time)} cy={mapY(displayData[displayData.length - 1].value)} r="4" fill={UI_ACCENT_GREEN} />
                )}
            </svg>
        );
    };

    return (
      <div className="tui-container" ref={graphRef}>
        <div style={{ marginBottom: '8px', borderBottom: `1px solid ${UI_BORDER_SOFT}`, paddingBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="tui-text-success" style={{ fontWeight: 'bold' }}>{sourceName}</span>
             {displayData.length > 0 && (
                <span className="tui-text-success">
                    CURRENT: {displayData[displayData.length - 1].value.toFixed(2)}
                </span>
            )}
            <div>
              <span className="tui-text-muted" style={{ marginRight: '10px' }}>{isPaused ? '[PAUSED]' : '[ACTIVE]'}</span>
              <Button size="small" onClick={() => setIsPaused(!isPaused)}>{isPaused ? 'Resume' : 'Pause'}</Button>
            </div>
        </div>
        <div style={{
          height: '300px',
          padding: '10px 0',
          backgroundColor: UI_BG_BLACK,
          overflow: 'hidden'
        }}>
            {renderGraph()}
        </div>
      </div>
    );
  };
