import React, { useState, useMemo } from 'react';
import { Alert, Button, Input } from 'antd';
import { useRosConnection } from '../hooks/useRosConnection.hook';
import { ControlModeHandler } from '../Services/ros/handlers/ControlMode.handler';
import {
    UI_ACCENT_GREEN,
    UI_ACCENT_BOX_SHADOW_SOFT,
    UI_BORDER_MUTED,
    UI_BORDER_SOFT,
    UI_CHROME_SURFACE,
    UI_COLOR_TRANSPARENT,
    UI_TEXT_ON_ACCENT,
    UI_TEXT_PRIMARY_ON_DARK,
} from '../Constants/uiTheme';

const ROS_URL_KEY = 'lucy_ros_url';

export const ConnectionControls: React.FC = () => {
    const { isConnected, isConnecting, connect, disconnect } = useRosConnection();

    const defaultRosUrl = useMemo(() => {
        if (typeof window === 'undefined') {
            throw new Error('Window is undefined');
        }
        const meta: string = import.meta.env.VITE_OVERRIDE_ROS_BRIDGE_SERVER_URL;
        if (meta) {
            return meta
        }

        const stored = localStorage.getItem(ROS_URL_KEY);
        if (stored) {
            return stored;
        }

        return (
            `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:${window.location.port}/rosbridge`
        );
    }, []);

    const [rosUrl, setRosUrl] = useState<string>(defaultRosUrl);
    const [connectionError, setConnectionError] = useState<string | null>(null);

    const handleConnect = async () => {
        setConnectionError(null);
        try {
            if (isConnected) {
                ControlModeHandler.getInstance().releaseControl();
                disconnect();
            } else {
                await connect(rosUrl);
                localStorage.setItem(ROS_URL_KEY, rosUrl);
            }
        } catch (error) {
            setConnectionError(error instanceof Error ? error.message : 'Connection failed');
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                <Input
                    size="small"
                    placeholder="ROS BRIDGE URL"
                    value={rosUrl}
                    onChange={(e) => setRosUrl(e.target.value)}
                    disabled={isConnecting}
                    style={{
                        width: 200,
                        backgroundColor: UI_CHROME_SURFACE,
                        borderColor: UI_BORDER_MUTED,
                        color: UI_TEXT_PRIMARY_ON_DARK,
                        fontFamily: 'monospace',
                        fontSize: 12,
                    }}
                />
                <Button
                    size="small"
                    onClick={() => void handleConnect()}
                    disabled={isConnecting}
                    style={{
                        backgroundColor: isConnected ? UI_COLOR_TRANSPARENT : UI_ACCENT_GREEN,
                        color: isConnected ? UI_TEXT_PRIMARY_ON_DARK : UI_TEXT_ON_ACCENT,
                        borderColor: isConnected ? UI_BORDER_SOFT : UI_ACCENT_GREEN,
                        boxShadow: isConnected ? 'none' : UI_ACCENT_BOX_SHADOW_SOFT,
                    }}
                >
                    {isConnected ? 'DISCONNECT' : 'CONNECT'}
                </Button>
            </div>
            {connectionError && (
                <Alert
                    message="CONNECTION ERROR"
                    description={
                        <div style={{ whiteSpace: 'pre-line', fontFamily: 'monospace' }}>
                            {connectionError}
                        </div>
                    }
                    type="error"
                    showIcon
                    closable
                    onClose={() => setConnectionError(null)}
                />
            )}
        </div>
    );
};
