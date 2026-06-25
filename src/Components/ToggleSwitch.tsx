import React from 'react';
import {
    UI_ACCENT_GREEN,
} from '../Constants/uiTheme.ts';

export interface ToggleSwitchProps {
    isOn: boolean;
    onToggle: (next: boolean) => void;
    title: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    textOn?: string;
    textOff?: string;
    width?: number;
    /** `above` stacks the label over the control; `inline` keeps label and control on one row. */
    titlePlacement?: 'above' | 'inline';
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
    isOn,
    onToggle,
    title,
    leftIcon,
    rightIcon,
    textOn = 'ON',
    textOff = 'OFF',
    width,
    titlePlacement = 'above',
}) => {
    const titleStyle: React.CSSProperties = {
        fontFamily: 'monospace',
        fontSize: 11,
        color: UI_ACCENT_GREEN,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        opacity: 0.8,
        whiteSpace: 'nowrap',
    };

    const toggle = (
        <div className="tui-toggle" style={{ width: width ? `${width}px` : 'auto', display: 'flex' }}>
            <button
                className={`tui-toggle-button${!isOn ? ' active' : ''}`}
                onClick={() => onToggle(false)}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, boxShadow: 'none', animation: 'none' }}
                aria-label={`${title}: ${textOff}`}
            >
                {leftIcon}
                {textOff}
            </button>
            <div className="tui-toggle-divider" />
            <button
                className={`tui-toggle-button${isOn ? ' active' : ''}`}
                onClick={() => onToggle(true)}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, boxShadow: 'none', animation: 'none' }}
                aria-label={`${title}: ${textOn}`}
            >
                {rightIcon}
                {textOn}
            </button>
        </div>
    );

    if (titlePlacement === 'inline') {
        return (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span style={titleStyle}>{title}</span>
                {toggle}
            </div>
        );
    }

    return (
        <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
            <span style={titleStyle}>{title}</span>
            {toggle}
        </div>
    );
};