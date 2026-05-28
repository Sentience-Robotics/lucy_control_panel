import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Input, Typography } from 'antd';
import { useRosConnection } from '../hooks/useRosConnection.hook.ts';
import { ConnectedClientsHandler } from '../Services/ros/handlers/ConnectedClients.handler.ts';
import { ControlModeHandler } from '../Services/ros/handlers/ControlMode.handler.ts';
import {
    UI_ACCENT_BOX_SHADOW_SOFT,
    UI_ACCENT_GREEN,
    UI_WARNING,
    UI_ACCENT_TEXT_SHADOW,
    UI_BORDER_MUTED,
    UI_BORDER_SOFT,
    UI_CHROME_SURFACE,
    UI_COLOR_TRANSPARENT,
    UI_ERROR,
    UI_TEXT_ON_ACCENT,
    UI_TEXT_PRIMARY_ON_DARK,
    UI_TEXT_SECONDARY_MUTED,
} from '../Constants/uiTheme.ts';

const { Text } = Typography;

const ROS_URL_KEY = 'lucy_ros_url';

export interface LucyControlPanelHeaderProps {
    /** Content between the title and the ROS bridge controls (e.g. statistics on the control page, tags on Configuration). */
    children?: React.ReactNode;
}

export const LucyControlPanelHeader: React.FC<LucyControlPanelHeaderProps> = ({ children }) => {
    const {
        connectionStatus,
        isConnected,
        isConnecting,
        connect,
        disconnect,
    } = useRosConnection();

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
    const [countState, setCountState] = useState<number>(0);
    const [activeControllerId, setActiveControllerId] = useState<string>(
        () => ControlModeHandler.getInstance().currentControllerId
    );

    useEffect(() => {
        const handler = new ConnectedClientsHandler((count: number) => {
            setCountState(count);
        });
        return () => {
            handler.unsubscribe();
        };
    }, []);

    useEffect(() => {
        return ControlModeHandler.getInstance().onControllerChanged(setActiveControllerId);
    }, []);

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

    const getConnectionStatusText = () => {
        switch (connectionStatus) {
            case 'connected':
                return 'CONNECTED';
            case 'connecting':
                return 'CONNECTING...';
            case 'disconnected':
                return 'DISCONNECTED';
            default:
                return 'UNKNOWN';
        }
    };

    const getConnectionStatusColor = () => {
        if (countState > 1) {
            return UI_WARNING;
        }
        switch (connectionStatus) {
            case 'connected':
                return UI_ACCENT_GREEN;
            case 'connecting':
                return UI_WARNING;
            case 'disconnected':
                return UI_ERROR;
            default:
                return UI_TEXT_SECONDARY_MUTED;
        }
    };

    const getControllerColor = () => {
        if (activeControllerId === ControlModeHandler.getInstance().clientId) return UI_ACCENT_GREEN;
        if (activeControllerId !== '') return UI_WARNING;
        return UI_TEXT_SECONDARY_MUTED;
    };

    const bridgeColor = getConnectionStatusColor();
    const controllerColor = getControllerColor();

    return (
        <div style={{ width: '100%' }}>
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: '100%',
                    flexWrap: 'wrap',
                    gap: 12,
                }}
            >
                <div style={{ flexShrink: 0 }}>
                    <Text
                        style={{
                            margin: 0,
                            color: UI_ACCENT_GREEN,
                            fontFamily: 'monospace',
                            textShadow: UI_ACCENT_TEXT_SHADOW,
                            fontSize: '18px',
                            fontWeight: 'bold',
                        }}
                    >
                        ▲ LUCY CONTROL PANEL
                    </Text>
                </div>

                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        flexWrap: 'wrap',
                        justifyContent: 'flex-end',
                        flex: '1 1 auto',
                        minWidth: 0,
                    }}
                >
                    {children}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <div
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '4px 10px',
                                borderRadius: 16,
                                backgroundColor: UI_CHROME_SURFACE,
                                border: `1px solid ${UI_BORDER_MUTED}`,
                            }}
                        >
                            <span
                                style={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: '50%',
                                    backgroundColor: bridgeColor,
                                    boxShadow: `0 0 8px ${bridgeColor}`,
                                }}
                            />
                            <Text
                                style={{
                                    color: bridgeColor,
                                    fontFamily: 'monospace',
                                    fontSize: 12,
                                }}
                            >
                                ROS BRIDGE:{countState > 0 ? ` ${countState}` : ''} {getConnectionStatusText()}
                            </Text>
                        </div>
                        <div
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                padding: '4px 10px',
                                borderRadius: 16,
                                backgroundColor: UI_CHROME_SURFACE,
                                border: `1px solid ${UI_BORDER_MUTED}`,
                            }}
                        >
                            <span
                                style={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: '50%',
                                    backgroundColor: controllerColor,
                                    boxShadow: `0 0 8px ${controllerColor}`,
                                }}
                            />
                            <Text
                                style={{
                                    color: controllerColor,
                                    fontFamily: 'monospace',
                                    fontSize: 12,
                                }}
                            >
                                {activeControllerId !== '' ? 'CONTROLLED' : 'UNCONTROLLED'}
                            </Text>
                        </div>
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
                </div>
            </div>

            {connectionError ? (
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
                    style={{ marginTop: 12 }}
                />
            ) : null}
        </div>
    );
};

/**
 * Joint/category counts on the control page — single-line so header height matches Configuration / Stream
 */
export const ControlPanelHeaderStats: React.FC<{ jointCount: number; categoryCount: number }> = ({
    jointCount,
    categoryCount,
}) => (
    <div
        style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
            fontFamily: 'monospace',
            lineHeight: 1.2,
        }}
    >
        <span style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
            <span style={{ color: UI_TEXT_SECONDARY_MUTED, fontSize: 10 }}>TOTAL JOINTS </span>
            <span style={{ color: UI_ACCENT_GREEN, fontSize: 16 }}>{jointCount}</span>
        </span>
        <span style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
            <span style={{ color: UI_TEXT_SECONDARY_MUTED, fontSize: 10 }}>CATEGORIES </span>
            <span style={{ color: UI_ACCENT_GREEN, fontSize: 16 }}>{categoryCount}</span>
        </span>
    </div>
);
