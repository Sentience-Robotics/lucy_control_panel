import React from 'react';

export interface ToggleSwitchProps {
    isOn: boolean;
    onToggle: (next: boolean) => void;
    title: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    textOn?: string;
    textOff?: string;
    width?: number;
    height?: number;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
    isOn,
    onToggle,
    title,
    leftIcon,
    rightIcon,
    textOn = 'ON',
    textOff = 'OFF',
    width = 180,
    height = 32
}) => {
    return (
        <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
            <span style={{
                fontFamily: 'monospace',
                fontSize: 11,
                color: '#00ff41',
                letterSpacing: 0.5,
                textTransform: 'uppercase',
                opacity: 0.8
            }}>
                {title}
            </span>
            <button
                onClick={() => onToggle(!isOn)}
                aria-pressed={isOn}
                aria-label={`${title}: ${isOn ? 'on' : 'off'}`}
                style={{
                    width,
                    height,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    position: 'relative',
                    padding: 2,
                    borderRadius: 18,
                    backgroundColor: '#0d0d0d',
                    border: '1px solid #2a2a2a',
                    cursor: 'pointer',
                    userSelect: 'none',
                    outline: 'none',
                    color: '#00ff41',
                }}
            >
                <div
                    style={{
                        position: 'absolute',
                        top: 2,
                        left: isOn ? `calc(50% + 2px)` : 2,
                        width: `calc(50% - 4px)`,
                        height: `calc(100% - 4px)`,
                        borderRadius: 16,
                        backgroundColor: '#00ff41',
                        boxShadow: isOn ? '0 0 12px #00ff41' : 'none',
                        transition: 'left 160ms ease, box-shadow 160ms ease',
                    }}
                />
                <span
                    style={{
                        width: '50%',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                        textAlign: 'center',
                        fontFamily: 'monospace',
                        fontSize: 12,
                        fontWeight: 600,
                        letterSpacing: 0.5,
                        zIndex: 1,
                        color: isOn ? '#00ff41' : '#000',
                        opacity: isOn ? 0.9 : 1,
                    }}
                >
                    {leftIcon}
                    {textOff}
                </span>
                <span
                    style={{
                        width: '50%',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                        textAlign: 'center',
                        fontFamily: 'monospace',
                        fontSize: 12,
                        fontWeight: 600,
                        letterSpacing: 0.5,
                        zIndex: 1,
                        color: isOn ? '#000' : '#00ff41',
                    }}
                >
                    {rightIcon}
                    {textOn}
                </span>
            </button>
        </div>
    );
};