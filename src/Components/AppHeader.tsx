import React, { useEffect, useState, useRef } from 'react';
import { Button, Tooltip, Typography, Grid } from 'antd';
import { SettingOutlined, ReadOutlined } from '@ant-design/icons';
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
const { useBreakpoint } = Grid;

export const AppHeader: React.FC = () => {
    const { connectionStatus, isConnected, connect, disconnect, currentUrl } = useRosConnection();
    const [countState, setCountState] = useState<number>(0);
    const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
    const [activeControllerId, setActiveControllerId] = useState<string>(
        () => ControlModeHandler.getInstance().currentControllerId
    );
    const connectionStatusRef = useRef(connectionStatus);
    const currentUrlRef = useRef(currentUrl);
    const screens = useBreakpoint();
    const isMobile = !screens.lg;

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

        checkAutoConnect();
        timer = setInterval(checkAutoConnect, 5000);

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

    const handleConnectionChange = () => {
        if (isConnected) {
            disconnect()
        } else {
            connect(currentUrl)
        }
    }

    const bridgeColor = getConnectionStatusColor();
    const controllerColor = getControllerColor();
    const documentationUrl = import.meta.env.VITE_DOCUMENTATION_URL;

    const statusStyle: React.CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 10px',
        borderRadius: 16,
        backgroundColor: UI_CHROME_SURFACE,
        border: `1px solid ${UI_BORDER_MUTED}`,
    };

    const dotStyle: React.CSSProperties = {
        width: 10,
        height: 10,
        borderRadius: '50%',
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', width: '100%', gap: isMobile ? 8 : 12 }}>
            <Tooltip title={`ROS BRIDGE: ${getConnectionStatusText()}${countState > 0 ? ` (${countState})` : ''}`}>
                <div style={statusStyle}>
                    <span
                        style={{
                            ...dotStyle,
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
                        {isMobile ? `${countState}` : `ROS BRIDGE:${countState > 0 ? ` ${countState}` : ''} ${getConnectionStatusText()}`}
                    </Text>
                </div>
            </Tooltip>
            <Tooltip title={activeControllerId !== '' ? 'CONTROLLED' : 'UNCONTROLLED'}>
                <div style={statusStyle}>
                    <span
                        style={{
                            ...dotStyle,
                            backgroundColor: controllerColor,
                            boxShadow: `0 0 8px ${controllerColor}`,
                        }}
                    />
                    {!isMobile && (
                        <Text
                            style={{
                                color: controllerColor,
                                fontFamily: 'monospace',
                                fontSize: 12,
                            }}
                        >
                            {activeControllerId !== '' ? 'CONTROLLED' : 'UNCONTROLLED'}
                        </Text>
                    )}
                </div>
            </Tooltip>
            {documentationUrl && (
                <Tooltip title="Documentation">
                    <Button
                        icon={isMobile ? <ReadOutlined /> : undefined}
                        onClick={() => window.open(documentationUrl, '_blank')}
                    >
                        {!isMobile && 'Documentation'}
                    </Button>
                </Tooltip>
            )}
            <Tooltip title="Settings">
                <Button icon={<SettingOutlined />} onClick={() => setIsSettingsModalVisible(true)} />
            </Tooltip>
            <Tooltip title="Quick Connect">
                <Button onClick={() => handleConnectionChange()} loading={connectionStatus === 'connecting'} >
                    {
                        connectionStatus === 'connecting'
                            ? 'connecting' : connectionStatus === 'connected'
                                ? 'disconnect' : 'connect'
                    }
                </Button>
            </Tooltip>
            <SettingsModal
                visible={isSettingsModalVisible}
                onClose={() => setIsSettingsModalVisible(false)}
            />
        </div>
    );
};
