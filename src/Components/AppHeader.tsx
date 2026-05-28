import React, { useEffect, useState } from 'react';
import { Typography } from 'antd';
import { useRosConnection } from '../hooks/useRosConnection.hook';
import { ConnectedClientsHandler } from '../Services/ros/handlers/ConnectedClients.handler';
import { ControlModeHandler } from '../Services/ros/handlers/ControlMode.handler';
import {
    UI_ACCENT_GREEN,
    UI_WARNING,
    UI_BORDER_MUTED,
    UI_CHROME_SURFACE,
    UI_ERROR,
    UI_TEXT_SECONDARY_MUTED,
} from '../Constants/uiTheme';

const { Text } = Typography;

export const AppHeader: React.FC = () => {
    const { connectionStatus, isConnected } = useRosConnection();
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
        if (countState > 1 && isConnected) {
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
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', width: '100%', gap: 12 }}>
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
        </div>
    );
};
