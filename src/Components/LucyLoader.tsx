import React from 'react';
import { Button, Typography } from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';
import { useRosConnection } from '../hooks/useRosConnection.hook.ts';
import {
    UI_ACCENT_GREEN,
    UI_TEXT_PRIMARY_ON_DARK,
    UI_TEXT_SUBTLE,
} from '../Constants/uiTheme.ts';
import './LucyLoader.css';

const { Text } = Typography;

export interface LucyLoaderProps {
    /** Big title shown under the spinner (defaults to "LUCY"). */
    title?: string;
    /** Status line below the title (e.g. "Connecting to ROS bridge"). */
    label?: string;
    /** Display a connect button bellow the messages */
    connectButton?: boolean;
    /** Optional supporting message, shown smaller below the label. */
    detail?: string;
    /** Compact = no full-viewport min-height (use inside cards). */
    compact?: boolean;
    /** Show the spinner animation. */
    showSpinner?: boolean;
}

/**
 * Used in place of static "Connect to ROS" messages while a page is waiting on
 * the ROS bridge or the active hardware config.
 */
export const LucyLoader: React.FC<LucyLoaderProps> = ({
    title = 'LUCY',
    label,
    connectButton,
    detail,
    compact = false,
    showSpinner = true,
}) => {
    const { connect, currentUrl, connectionStatus } = useRosConnection();

    return (
        <div className={`lucy-loader${compact ? ' lucy-loader-compact' : ''}`}>
            {showSpinner && <div className="lucy-loader-spinner" />}
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
                {connectButton && (
                    <Button
                        icon={<ThunderboltOutlined />}
                        onClick={() => connect(currentUrl)}
                        loading={connectionStatus === 'connecting'}
                        style={{ marginTop: 24 }}
                    >
                        Connect
                    </Button>
                )}
            </div>
        </div>
    );
};

export default LucyLoader;
