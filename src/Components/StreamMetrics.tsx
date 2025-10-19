import React from 'react';

interface StreamMetricsProps {
    fps: number;
    frameDelay: number;
    fontSize?: number;
    showLabels?: boolean;
}

export const StreamMetrics: React.FC<StreamMetricsProps> = ({ 
    fps, 
    frameDelay, 
    fontSize = 11,
    showLabels = true 
}) => {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ 
                color: '#666', 
                fontFamily: 'monospace', 
                fontSize,
                fontWeight: 'bold'
            }}>
                {fps > 0 ? `${fps}${showLabels ? ' FPS' : ''}` : `--${showLabels ? ' FPS' : ''}`}
            </span>
            <span style={{ color: '#666', fontSize: fontSize - 1 }}>|</span>
            <span style={{ 
                color: '#666', 
                fontFamily: 'monospace', 
                fontSize,
                fontWeight: 'bold'
            }}>
                {frameDelay > 0 ? `${frameDelay}${showLabels ? 'ms' : ''}` : `--${showLabels ? 'ms' : ''}`}
            </span>
        </div>
    );
};
