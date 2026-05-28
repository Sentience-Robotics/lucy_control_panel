import React, { useEffect, useState, useRef } from 'react';
import { Button, Tooltip, Typography } from 'antd';
import { SettingOutlined, ThunderboltOutlined, InfoCircleOutlined } from '@ant-design/icons';
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
import { SettingsModal, AUTO_CONNECT_KEY } from './SettingsModal';

const { Text } = Typography;

export const AppHeader: React.FC = () => {
    const { connectionStatus, isConnected, connect, currentUrl } = useRosConnection();
    const [countState, setCountState] = useState<number>(0);
    const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
    const [activeControllerId, setActiveControllerId] = useState<string>(
        () => ControlModeHandler.getInstance().currentControllerId
    );
    const connectionStatusRef = useRef(connectionStatus);
    const currentUrlRef = useRef(currentUrl);

    useEffect(() => {
        connectionStatusRef.current = connectionStatus;
    }, [connectionStatus]);

    useEffect(() => {
        currentUrlRef.current = currentUrl;
    }, [currentUrl]);

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

    useEffect(() => {
        let timer: ReturnType<typeof setInterval> | null = null;

        const checkAutoConnect = () => {
            const isAutoConnectEnabled = localStorage.getItem(AUTO_CONNECT_KEY) === 'true';
            if (isAutoConnectEnabled && connectionStatusRef.current === 'disconnected') {
                connect(currentUrlRef.current).catch(() => {});
            }
        };

        // Check on mount
        checkAutoConnect();

        // Start interval
        timer = setInterval(checkAutoConnect, 5000); // 5 seconds

        const handleAutoConnectChange = () => {
            if (localStorage.getItem(AUTO_CONNECT_KEY) === 'true') {
                checkAutoConnect();
            }
        };

        window.addEventListener('autoConnectChanged', handleAutoConnectChange);

        return () => {
            if (timer) clearInterval(timer);
            window.removeEventListener('autoConnectChanged', handleAutoConnectChange);
        };
    }, [connect]);

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
    const documentationUrl = import.meta.env.VITE_DOCUMENTATION_URL;

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
            {documentationUrl && (
                <Tooltip title="Documentation">
                    <Button onClick={() => window.open(documentationUrl, '_blank')}>
                        Documentation
                    </Button>
                </Tooltip>
            )}
            <Tooltip title="Settings">
                <Button icon={<SettingOutlined />} onClick={() => setIsSettingsModalVisible(true)} />
            </Tooltip>
            <Tooltip title="Quick Connect">
                <Button icon={<ThunderboltOutlined />} onClick={() => connect(currentUrl)} loading={connectionStatus === 'connecting'} />
            </Tooltip>
            <SettingsModal
                visible={isSettingsModalVisible}
                onClose={() => setIsSettingsModalVisible(false)}
            />
        </div>
    );
};
