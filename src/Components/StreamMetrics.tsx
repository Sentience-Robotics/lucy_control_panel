import React from 'react';
import { Tooltip } from 'antd';
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
            <Tooltip title="Frames Per Second: How many frames are displayed each second. Higher is smoother.">
                <span style={{ 
                    color: UI_TEXT_SECONDARY_MUTED, 
                    fontFamily: 'monospace', 
                    fontSize,
                    fontWeight: 'bold',
                    cursor: 'help'
                }}>
                    {fps > 0 ? `${fps}${showLabels ? ' FPS' : ''}` : `--${showLabels ? ' FPS' : ''}`}
                </span>
            </Tooltip>
            <span style={{ color: UI_TEXT_SECONDARY_MUTED, fontSize: fontSize - 1 }}>|</span>
            <Tooltip title="Frame Delay (ms): The time from frame capture to display. Lower is better.">
                <span style={{ 
                    color: UI_TEXT_SECONDARY_MUTED, 
                    fontFamily: 'monospace', 
                    fontSize,
                    fontWeight: 'bold',
                    cursor: 'help'
                }}>
                    {frameDelay > 0 ? `${frameDelay}${showLabels ? 'ms' : ''}` : `--${showLabels ? 'ms' : ''}`}
                </span>
            </Tooltip>
        </div>
    );
};
