import React from 'react';
import { UI_TEXT_SECONDARY_MUTED } from '../Constants/uiTheme.ts';

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
                color: UI_TEXT_SECONDARY_MUTED, 
                fontFamily: 'monospace', 
                fontSize,
                fontWeight: 'bold'
            }}>
                {fps > 0 ? `${fps}${showLabels ? ' FPS' : ''}` : `--${showLabels ? ' FPS' : ''}`}
            </span>
            <span style={{ color: UI_TEXT_SECONDARY_MUTED, fontSize: fontSize - 1 }}>|</span>
            <span style={{ 
                color: UI_TEXT_SECONDARY_MUTED, 
                fontFamily: 'monospace', 
                fontSize,
                fontWeight: 'bold'
            }}>
                {frameDelay > 0 ? `${frameDelay}${showLabels ? 'ms' : ''}` : `--${showLabels ? 'ms' : ''}`}
            </span>
        </div>
    );
};
