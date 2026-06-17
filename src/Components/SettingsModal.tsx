import React, { useEffect, useState } from 'react';
import { Modal, Input, Button, Form, Typography, Space } from 'antd';
import { InfoCircleOutlined, SettingOutlined } from '@ant-design/icons';
import { useRosConnection } from '../hooks/useRosConnection.hook';
import { useActiveHardwareRos } from '../contexts/ActiveHardwareRosContext';
import {
    UI_ACCENT_GREEN,
    UI_BORDER_SOFT,
    UI_COLOR_TRANSPARENT,
    UI_MODAL_MASK_BG,
    UI_TEXT_ON_ACCENT,
    UI_TEXT_PRIMARY_ON_DARK,
} from '../Constants/uiTheme';
import { ToggleSwitch } from './ToggleSwitch';

const { Text, Title } = Typography;

interface SettingsModalProps {
    visible: boolean;
    onClose: () => void;
}

export const AUTO_CONNECT_KEY = 'autoConnectEnabled';

export const isAutoConnectEnabled = () => localStorage.getItem(AUTO_CONNECT_KEY) !== 'false';

export const SHOW_DEGREES_KEY = 'showDegreesEnabled';

export const isShowDegreesEnabled = () => localStorage.getItem(SHOW_DEGREES_KEY) !== 'false';

export const SettingsModal: React.FC<SettingsModalProps> = ({ visible, onClose }) => {
    const { connect, currentUrl, connectionStatus } = useRosConnection();
    const { activeHardwareConfigName, controllerConfigsFromActive } = useActiveHardwareRos();

    const [rosUrl, setRosUrl] = useState(currentUrl);
    const [autoConnect, setAutoConnect] = useState(isAutoConnectEnabled);
    const [showDegrees, setShowDegrees] = useState(isShowDegreesEnabled);

    useEffect(() => {
        setRosUrl(currentUrl);
    }, [currentUrl]);

    useEffect(() => {
        localStorage.setItem(AUTO_CONNECT_KEY, String(autoConnect));
        window.dispatchEvent(new Event('autoConnectChanged'));
    }, [autoConnect]);

    useEffect(() => {
        localStorage.setItem(SHOW_DEGREES_KEY, String(showDegrees));
        window.dispatchEvent(new Event('showDegreesChanged'));
    }, [showDegrees]);

    const handleSave = async () => {
        try {
            await connect(rosUrl);
            onClose();
        } catch (error) {
            // Error is already logged in the hook
        }
    };

    const jointsLoaded = controllerConfigsFromActive
        ? controllerConfigsFromActive.reduce((acc, config) => acc + config.joints.length, 0)
        : 0;

    return (
        <Modal
            title={
                <Title level={4} style={{ color: UI_TEXT_PRIMARY_ON_DARK, margin: 0 }}>
                    <SettingOutlined /> Settings
                </Title>
            }
            open={visible}
            onCancel={onClose}
            footer={[
                <Button
                    key="back"
                    onClick={onClose}
                    style={{
                        backgroundColor: UI_COLOR_TRANSPARENT,
                        borderColor: UI_BORDER_SOFT,
                        color: UI_TEXT_PRIMARY_ON_DARK,
                    }}
                >
                    Cancel
                </Button>,
                <Button
                    key="submit"
                    type="primary"
                    onClick={handleSave}
                    loading={connectionStatus === 'connecting'}
                    style={{
                        backgroundColor: UI_ACCENT_GREEN,
                        borderColor: UI_ACCENT_GREEN,
                        color: UI_TEXT_ON_ACCENT,
                    }}
                >
                    Save & Connect
                </Button>,
            ]}
            styles={{ mask: { backgroundColor: UI_MODAL_MASK_BG } }}
            className="dark-modal"
        >
            <Form layout="vertical">
                <Form.Item label={<Text style={{ color: UI_TEXT_PRIMARY_ON_DARK }}>ROS Bridge URL</Text>}>
                    <Input
                        value={rosUrl}
                        onChange={(e) => setRosUrl(e.target.value)}
                        placeholder="ws://localhost:9090"
                    />
                </Form.Item>
                <Form.Item
                    tooltip={{ title: 'When enabled, the application will attempt to connect to the ROS bridge automatically on startup and periodically when disconnected.', icon: <InfoCircleOutlined /> }}
                >
                    <ToggleSwitch
                        isOn={autoConnect}
                        onToggle={setAutoConnect}
                        title="Auto-connect"
                        width={120}
                    />
                </Form.Item>
                <Form.Item
                    tooltip={{ title: 'Choose whether joint angles are displayed and entered in degrees or radians.', icon: <InfoCircleOutlined /> }}
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
                <Form.Item label={<Text style={{ color: UI_TEXT_PRIMARY_ON_DARK }}>Connection Info</Text>}>
                    <Space direction="vertical">
                        <Text style={{ color: UI_TEXT_PRIMARY_ON_DARK }}>Status: {connectionStatus}</Text>
                        <Text style={{ color: UI_TEXT_PRIMARY_ON_DARK }}>Joints Loaded: {jointsLoaded}</Text>
                        <Text style={{ color: UI_TEXT_PRIMARY_ON_DARK }}>Active Configuration: {activeHardwareConfigName || 'N/A'}</Text>
                    </Space>
                </Form.Item>
            </Form>
        </Modal>
    );
};
