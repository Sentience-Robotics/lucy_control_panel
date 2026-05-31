import React from 'react';

interface StreamSwitchProps {
    labelA: string;
    labelB: string;
    /** false → labelA is active; true → labelB is active */
    value: boolean;
    onChange: (value: boolean) => void;
}

/** Two-label toggle. Clicking either side always switches to the other state. */
export const StreamSwitch: React.FC<StreamSwitchProps> = ({ labelA, labelB, value, onChange }) => (
    <div className="tui-toggle">
        <button
            className={`tui-toggle-button${!value ? ' active' : ''}`}
            onClick={() => onChange(!value)}
            style={{ padding: '2px 8px', fontSize: 10 }}
        >
            {labelA}
        </button>
        <div className="tui-toggle-divider" />
        <button
            className={`tui-toggle-button${value ? ' active' : ''}`}
            onClick={() => onChange(!value)}
            style={{ padding: '2px 8px', fontSize: 10 }}
        >
            {labelB}
        </button>
    </div>
);
