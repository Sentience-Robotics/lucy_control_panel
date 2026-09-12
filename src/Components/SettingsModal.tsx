import React, { useEffect, useState } from 'react';
import {
    Input,
    Button,
    Form,
    Typography,
    Space,
    Select,
} from 'antd';
import {
    InfoCircleOutlined,
    SettingOutlined,
} from '@ant-design/icons';
import { useRosConnection } from '../hooks/useRosConnection.hook';
import { getOriginRosUrl } from '../Services/ros/ros.service';
import { useActiveHardwareRos } from '../contexts/ActiveHardwareRosContext';
import { useDock, availableDock } from '../contexts/DockContext';
import {
    UI_ACCENT_BLUE,
    UI_ACCENT_GREEN,
    UI_BORDER_SOFT,
    UI_COLOR_TRANSPARENT,
    UI_TEXT_ON_ACCENT,
    UI_TEXT_PRIMARY_ON_DARK,
} from '../Constants/uiTheme';
import { ToggleSwitch } from './ToggleSwitch';
import {
    GETTING_STARTED_COMPLETED_KEY,
    REDO_GETTING_STARTED_EVENT,
} from './GettingStartedModal';
import { MovableModal } from './MovableModal';

const { Text } = Typography;

interface SettingsModalProps {
    visible: boolean;
    onClose: () => void;
}

export const AUTO_CONNECT_KEY = 'autoConnectEnabled';

export const isAutoConnectEnabled = () =>
    localStorage.getItem(AUTO_CONNECT_KEY) !== 'false';

export const SHOW_DEGREES_KEY = 'showDegreesEnabled';

export const isShowDegreesEnabled = () =>
    localStorage.getItem(SHOW_DEGREES_KEY) !== 'false';

/** Fixed hint for the URL field: the bridge served alongside this page. */
const originRosUrl = getOriginRosUrl();

export const SettingsModal: React.FC<SettingsModalProps> = ({
    visible,
    onClose,
}) => {
    const {
        connect,
        disconnect,
        isConnected,
        currentUrl,
        connectionStatus,
    } = useRosConnection();

    const {
        activeHardwareConfigName,
        controllerConfigsFromActive,
    } = useActiveHardwareRos();

    const {
        currentDock,
        setCurrentDock
    } = useDock();

    const [rosUrl, setRosUrl] = useState(currentUrl);
    const [autoConnect, setAutoConnect] = useState(
        isAutoConnectEnabled
    );
    const [showDegrees, setShowDegrees] = useState(
        isShowDegreesEnabled
    );

    useEffect(() => {
        setRosUrl(currentUrl);
    }, [currentUrl]);

    useEffect(() => {
        localStorage.setItem(
            AUTO_CONNECT_KEY,
            String(autoConnect)
        );
        window.dispatchEvent(new Event('autoConnectChanged'));
    }, [autoConnect]);

    useEffect(() => {
        localStorage.setItem(
            SHOW_DEGREES_KEY,
            String(showDegrees)
        );
        window.dispatchEvent(new Event('showDegreesChanged'));
    }, [showDegrees]);

    const handleSave = async () => {
        try {
            await connect(rosUrl);
            onClose();
        } catch {
            // Error is already logged in the hook
        }
    };

    const handleConnectionChange = () => {
        if (isConnected) {
            // Disconnecting manually disables auto-connect
            // so it doesn't immediately reconnect.
            setAutoConnect(false);
            disconnect();
        } else {
            connect(rosUrl).catch(() => {});
        }
    };

    const jointsLoaded = controllerConfigsFromActive
        ? controllerConfigsFromActive.reduce(
              (acc, config) => acc + config.joints.length,
              0
          )
        : 0;

    const dockOptions = availableDock.map((dock) => ({
        label: dock,
        value: dock,
    }));

    return (
        <MovableModal
            modalName="SETTINGS"
            isVisible={visible}
            onClose={onClose}
            centered
            initialSize={{ w: 480, h: 550 }}
            minWidth={480}
            footerWrap={false}
            header={
                <SettingOutlined
                    style={{ color: UI_ACCENT_GREEN }}
                />
            }
            footer={
                <>
                    <Button
                        onClick={handleConnectionChange}
                        loading={
                            connectionStatus === 'connecting'
                        }
                        style={{
                            backgroundColor:
                                UI_COLOR_TRANSPARENT,
                            borderColor: UI_BORDER_SOFT,
                            color: UI_TEXT_PRIMARY_ON_DARK,
                        }}
                    >
                        {connectionStatus === 'connecting'
                            ? 'Connecting...'
                            : isConnected
                              ? 'Disconnect'
                              : 'Connect'}
                    </Button>

                    <Button
                        key="back"
                        onClick={onClose}
                        style={{
                            backgroundColor:
                                UI_COLOR_TRANSPARENT,
                            borderColor: UI_BORDER_SOFT,
                            color: UI_TEXT_PRIMARY_ON_DARK,
                        }}
                    >
                        Cancel
                    </Button>

                    <Button
                        key="submit"
                        type="primary"
                        onClick={handleSave}
                        loading={
                            connectionStatus === 'connecting'
                        }
                        style={{
                            backgroundColor: UI_ACCENT_GREEN,
                            borderColor: UI_ACCENT_GREEN,
                            color: UI_TEXT_ON_ACCENT,
                        }}
                    >
                        Save & Connect
                    </Button>
                </>
            }
        >
            <Form layout="vertical">
                <Form.Item
                    label={
                        <Text
                            style={{
                                color: UI_TEXT_PRIMARY_ON_DARK,
                            }}
                        >
                            ROS Bridge URL
                        </Text>
                    }
                    tooltip={{
                        title: 'WebSocket address of the rosbridge server (e.g. ws://host:port/rosbridge). Saved locally and reused on next launch.',
                        icon: (
                            <InfoCircleOutlined
                                style={{
                                    color: UI_ACCENT_BLUE,
                                }}
                            />
                        ),
                        zIndex: 1100,
                    }}
                >
                    <Input
                        value={rosUrl}
                        onChange={(e) =>
                            setRosUrl(e.target.value)
                        }
                        placeholder={originRosUrl}
                    />
                </Form.Item>

                <Form.Item
                    tooltip={{
                        title: 'When enabled, the application will attempt to connect to the ROS bridge automatically on startup and periodically when disconnected.',
                        icon: <InfoCircleOutlined />,
                        zIndex: 1100,
                    }}
                >
                    <Space align="center" wrap>
                        <ToggleSwitch
                            isOn={autoConnect}
                            onToggle={setAutoConnect}
                            title="Auto-connect"
                            width={120}
                        />
                    </Space>
                </Form.Item>

                <Form.Item
                    tooltip={{
                        title: 'Choose whether joint angles are displayed and entered in degrees or radians.',
                        icon: <InfoCircleOutlined />,
                        zIndex: 1100,
                    }}
                >
                    <ToggleSwitch
                        isOn={showDegrees}
                        onToggle={setShowDegrees}
                        title="Angle units"
                        textOn="DEGREES"
                        textOff="RADIANS"
                        width={180}
                    />
                </Form.Item>

                <Form.Item
                    label={
                        <Text
                            style={{
                                color: UI_TEXT_PRIMARY_ON_DARK,
                                fontWeight: 'bold',
                            }}
                        >
                            Choose your dock
                        </Text>
                    }
                    tooltip={{
                        title: 'Choose which viewer you want to display in the dock.',
                        icon: (
                            <InfoCircleOutlined
                                style={{
                                    color: UI_ACCENT_BLUE,
                                }}
                            />
                        ),
                        zIndex: 1100,
                    }}
                >
                    <Select
                        value={currentDock}
                        onChange={(value) => {
                            setCurrentDock(value);
                            onClose();
                        }}
                        options={dockOptions}
                        style={{ width: '100%' }}
                        placeholder="Select a dock"
                        getPopupContainer={() => document.body}
                        styles={{
                            popup: {
                                root: {
                                    zIndex: 1100,
                                },
                            },
                        }}
                    />
                </Form.Item>

                <Form.Item
                    label={
                        <Text
                            style={{
                                color: UI_TEXT_PRIMARY_ON_DARK,
                                fontWeight: 'bold',
                            }}
                        >
                            Connection Info
                        </Text>
                    }
                >
                    <Space direction="vertical">
                        <Text
                            style={{
                                color: UI_TEXT_PRIMARY_ON_DARK,
                            }}
                        >
                            Joints Loaded: {jointsLoaded}
                        </Text>

                        <Text
                            style={{
                                color: UI_TEXT_PRIMARY_ON_DARK,
                            }}
                        >
                            Active Configuration:{' '}
                            {activeHardwareConfigName || 'N/A'}
                        </Text>
                    </Space>
                </Form.Item>

                <Form.Item>
                    <Button
                        onClick={() => {
                            localStorage.removeItem(
                                GETTING_STARTED_COMPLETED_KEY
                            );

                            window.dispatchEvent(
                                new Event(
                                    REDO_GETTING_STARTED_EVENT
                                )
                            );

                            onClose();
                        }}
                        style={{
                            backgroundColor:
                                UI_COLOR_TRANSPARENT,
                            borderColor: UI_BORDER_SOFT,
                            color: UI_TEXT_PRIMARY_ON_DARK,
                        }}
                    >
                        Redo getting started
                    </Button>
                </Form.Item>
            </Form>
        </MovableModal>
    );
};
