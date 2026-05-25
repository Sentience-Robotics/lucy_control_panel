import React from 'react';
import { Typography } from 'antd';
import {
    UI_ACCENT_GREEN,
    UI_TEXT_PRIMARY_ON_DARK,
    UI_TEXT_SUBTLE,
    uiAccentRgba,
} from '../Constants/uiTheme.ts';
import './LucyLoader.css';

const { Text } = Typography;

export interface LucyLoaderProps {
    /** Big title shown under the spinner (defaults to "LUCY"). */
    title?: string;
    /** Status line below the title (e.g. "Connecting to ROS bridge"). */
    label?: string;
    /** Optional supporting message, shown smaller below the label. */
    detail?: string;
    /** Compact = no full-viewport min-height (use inside cards). */
    compact?: boolean;
}

/**
 * Animated Lucy loader: a triple-ring spinner around the brand mark.
 *
 * Used in place of static "Connect to ROS" messages while a page is waiting on
 * the ROS bridge or the active hardware config.
 */
export const LucyLoader: React.FC<LucyLoaderProps> = ({
    title = 'LUCY',
    label,
    detail,
    compact = false,
}) => {
    return (
        <div className={`lucy-loader${compact ? ' lucy-loader-compact' : ''}`}>
            <div
                className="lucy-loader-rings"
                style={
                    {
                        '--lucy-loader-accent': UI_ACCENT_GREEN,
                        '--lucy-loader-accent-soft': uiAccentRgba(0.25),
                        '--lucy-loader-accent-glow': uiAccentRgba(0.45),
                    } as React.CSSProperties
                }
                aria-hidden
            >
                <span className="lucy-loader-ring lucy-loader-ring-outer" />
                <span className="lucy-loader-ring lucy-loader-ring-middle" />
                <span className="lucy-loader-ring lucy-loader-ring-inner" />
                <span className="lucy-loader-core" />
            </div>
            <div className="lucy-loader-text">
                <Text
                    strong
                    style={{
                        color: UI_TEXT_PRIMARY_ON_DARK,
                        fontSize: 18,
                        letterSpacing: 4,
                    }}
                >
                    {title}
                </Text>
                {label ? (
                    <Text
                        style={{
                            color: UI_ACCENT_GREEN,
                            fontSize: 13,
                            letterSpacing: 2,
                            marginTop: 4,
                        }}
                    >
                        {label}
                    </Text>
                ) : null}
                {detail ? (
                    <Text
                        style={{
                            color: UI_TEXT_SUBTLE,
                            fontSize: 12,
                            marginTop: 6,
                            maxWidth: 360,
                            textAlign: 'center',
                        }}
                    >
                        {detail}
                    </Text>
                ) : null}
            </div>
        </div>
    );
};

export default LucyLoader;
