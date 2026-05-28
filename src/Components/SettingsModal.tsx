import React, { useEffect, useState } from 'react';
import { Modal, Input, Button, Switch, Tooltip, Typography, Form } from 'antd';
import { useRosConnection } from '../hooks/useRosConnection.hook';
import { InfoCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface SettingsModalProps {
    visible: boolean;
    onClose: () => void;
}

const AUTO_CONNECT_KEY = 'autoConnectEnabled';

export const SettingsModal: React.FC<SettingsModalProps> = ({ visible, onClose }) => {
    const { connect, currentUrl, connectionStatus } = useRosConnection();
    const [rosUrl, setRosUrl] = useState(currentUrl);
    const [autoConnect, setAutoConnect] = useState(() => {
        return localStorage.getItem(AUTO_CONNECT_KEY) === 'true';
    });

    useEffect(() => {
        setRosUrl(currentUrl);
    }, [currentUrl]);

    useEffect(() => {
        localStorage.setItem(AUTO_CONNECT_KEY, String(autoConnect));
        // Logic for auto-connect will be handled in a higher-level component or service
    }, [autoConnect]);

    const handleSave = async () => {
        try {
            await connect(rosUrl);
            onClose();
        } catch (error) {
            // Error is already logged in the hook
        }
    };

    return (
        <Modal
            title="Settings"
            visible={visible}
            onCancel={onClose}
            footer={[
                <Button key="back" onClick={onClose}>
                    Cancel
                </Button>,
                <Button key="submit" type="primary" onClick={handleSave} loading={connectionStatus === 'connecting'}>
                    Save & Connect
                </Button>,
            ]}
        >
            <Form layout="vertical">
                <Form.Item label="ROS Bridge URL">
                    <Input
                        value={rosUrl}
                        onChange={(e) => setRosUrl(e.target.value)}
                        placeholder="ws://localhost:9090"
                    />
                </Form.Item>
                <Form.Item
                    label="Auto-connect"
                    tooltip={{ title: 'When enabled, the application will attempt to connect to the ROS bridge automatically on startup and after a disconnection.', icon: <InfoCircleOutlined /> }}
                >
                    <Switch checked={autoConnect} onChange={setAutoConnect} />
                </Form.Item>
                <Form.Item label="Connection Info">
                    <Text>Status: {connectionStatus}</Text><br/>
                    {/* Placeholder for more info */}
                    <Text>Joints Loaded: N/A</Text><br/>
                    <Text>Active Configuration: N/A</Text>
                </Form.Item>
            </Form>
        </Modal>
    );
};
