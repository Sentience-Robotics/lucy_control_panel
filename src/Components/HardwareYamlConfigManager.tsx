import React, { useCallback, useState } from 'react';
import {
    Button,
    Card,
    Col,
    Input,
    List,
    Modal,
    Row,
    Space,
    Tooltip,
    Typography,
    message,
} from 'antd';
import {
    AimOutlined,
    CloudDownloadOutlined,
    DownloadOutlined,
    FolderOpenOutlined,
    ReloadOutlined,
    SaveOutlined,
} from '@ant-design/icons';
import {
    UI_ACCENT_GREEN,
    UI_BORDER_MUTED,
    UI_BORDER_SOFT,
    UI_CARD_SURFACE_STYLE,
    UI_PRIMARY_GREEN_BUTTON_STYLE,
    UI_WARNING_AMBER,
} from '../Constants/uiTheme.ts';

const { Text, Title } = Typography;

const QUICK_CONFIG_NAMES = ['default', 'staging', 'test_bench', 'production', 'minimal'];

export interface HardwareYamlConfigManagerProps {
    isConnected: boolean;
    yamlDoc: Record<string, unknown> | null;
    isDirty: boolean;
    saving: boolean;
    loadingConfig: boolean;
    hardwareRobotName: string;
    actuatorCount: number;
    sensorPressureCount: number;
    savedConfigNames: string[];
    activeConfigName: string;
    configListLoading: boolean;
    /** Selection used by ACTIVATE / DELETE toolbar on the parent page */
    toolbarTargetConfig: string;
    onToolbarTargetConfigChange: (configName: string) => void;
    onRefreshConfigList: () => void | Promise<void>;
    onSaveConfig: (trimmedName: string) => Promise<boolean>;
    /** Named configuration file, or empty string for active */
    onLoadConfig: (configName: string) => Promise<boolean>;
}

export const HardwareYamlConfigManager: React.FC<HardwareYamlConfigManagerProps> = ({
    isConnected,
    yamlDoc,
    isDirty,
    saving,
    loadingConfig,
    hardwareRobotName,
    actuatorCount,
    sensorPressureCount,
    savedConfigNames,
    activeConfigName,
    configListLoading,
    toolbarTargetConfig,
    onToolbarTargetConfigChange,
    onRefreshConfigList,
    onSaveConfig,
    onLoadConfig,
}) => {
    const [saveModalVisible, setSaveModalVisible] = useState(false);
    const [loadModalVisible, setLoadModalVisible] = useState(false);
    const [configNameInput, setConfigNameInput] = useState('');
    const [busyLoadId, setBusyLoadId] = useState<string | null>(null);

    const savedConfigCount = savedConfigNames.length;

    const handleSaveConfig = useCallback(async () => {
        if (!configNameInput.trim()) {
            message.warning('PLEASE ENTER A CONFIGURATION NAME');
            return;
        }
        const ok = await onSaveConfig(configNameInput.trim());
        if (ok) {
            setConfigNameInput('');
            setSaveModalVisible(false);
        }
    }, [configNameInput, onSaveConfig]);

    const handleLoadConfig = useCallback(
        async (configKey: string) => {
            setBusyLoadId(configKey);
            try {
                const ok = await onLoadConfig(configKey);
                if (ok) {
                    message.success(
                        configKey.trim()
                            ? `LOADED CONFIGURATION "${configKey.trim()}"`
                            : `LOADED ACTIVE CONFIGURATION (${activeConfigName || 'robot'})`,
                    );
                    setLoadModalVisible(false);
                }
            } finally {
                setBusyLoadId(null);
            }
        },
        [onLoadConfig, activeConfigName],
    );

    const modalStyles = {
        mask: { backgroundColor: 'rgba(0, 0, 0, 0.8)' },
    };

    const inputDarkStyle = {
        backgroundColor: '#1a1a1a',
        borderColor: '#444',
        color: '#fff',
    };

    const outlineBtnStyle = {
        backgroundColor: 'transparent',
        borderColor: UI_BORDER_SOFT,
        color: '#fff',
    };

    const activeTrim = activeConfigName.trim();
    const namedRows = activeTrim
        ? savedConfigNames.filter((n) => n.trim() !== activeTrim)
        : [...savedConfigNames];

    const activeRows = [
        {
            key: '__active__',
            title: 'ACTIVE CONFIGURATION (ON ROBOT)',
            subtitle: `RESOLVED NAME: ${activeConfigName || '—'}`,
            loadArg: '',
        },
        ...namedRows.map((n) => ({
            key: n,
            title: n.toUpperCase(),
            subtitle: 'NAMED CONFIGURATION UNDER CONFIGS/',
            loadArg: n,
        })),
    ];

    return (
        <>
            <Space>
                <Button
                    icon={<SaveOutlined />}
                    disabled={!isConnected || !yamlDoc || !isDirty}
                    onClick={() => setSaveModalVisible(true)}
                    style={outlineBtnStyle}
                >
                    SAVE CONFIG
                </Button>

                <Button
                    icon={<FolderOpenOutlined />}
                    disabled={!isConnected}
                    onClick={() => setLoadModalVisible(true)}
                    style={outlineBtnStyle}
                >
                    LOAD CONFIG{' '}
                    {savedConfigCount > 0 ? <span style={{ color: UI_ACCENT_GREEN }}>({savedConfigCount})</span> : null}
                </Button>
            </Space>

            <Modal
                title={
                    <Title level={4} style={{ color: UI_ACCENT_GREEN, margin: 0 }}>
                        <SaveOutlined /> SAVE HARDWARE CONFIGURATION
                    </Title>
                }
                open={saveModalVisible}
                onOk={handleSaveConfig}
                onCancel={() => {
                    setSaveModalVisible(false);
                    setConfigNameInput('');
                }}
                confirmLoading={saving}
                okText="SAVE CONFIGURATION"
                cancelText="CANCEL"
                okButtonProps={{
                    disabled: !yamlDoc || !isDirty || !configNameInput.trim(),
                    style: UI_PRIMARY_GREEN_BUTTON_STYLE,
                }}
                style={{ top: 100 }}
                styles={modalStyles}
                className="dark-modal"
            >
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                    {!isDirty ? (
                        <Text type="warning">NOTHING TO SAVE — MAKE EDITS FIRST.</Text>
                    ) : null}

                    <Input
                        placeholder="CONFIGURATION NAME (E.G. RIGHT_ARM_ONLY)"
                        value={configNameInput}
                        onChange={(e) => setConfigNameInput(e.target.value)}
                        onPressEnter={handleSaveConfig}
                        maxLength={80}
                        autoFocus
                        style={inputDarkStyle}
                    />

                    <div>
                        <Text style={{ color: '#888', fontSize: 12, marginBottom: 8, display: 'block' }}>
                            QUICK SUGGESTIONS:
                        </Text>
                        <Space wrap>
                            {QUICK_CONFIG_NAMES.map((suggestion) => (
                                <Button
                                    key={suggestion}
                                    size="small"
                                    type="dashed"
                                    onClick={() => setConfigNameInput(suggestion)}
                                    style={{
                                        borderColor: '#444',
                                        color: '#888',
                                        backgroundColor: 'transparent',
                                    }}
                                >
                                    {suggestion.toUpperCase()}
                                </Button>
                            ))}
                        </Space>
                    </div>

                    <Card size="small" style={{ ...UI_CARD_SURFACE_STYLE }}>
                        <Row gutter={16}>
                            <Col span={8}>
                                <Text strong style={{ color: '#fff' }}>
                                    ROBOT_NAME:
                                </Text>{' '}
                                <Text style={{ color: UI_ACCENT_GREEN }}>{hardwareRobotName || '—'}</Text>
                            </Col>
                            <Col span={8}>
                                <Text strong style={{ color: '#fff' }}>
                                    ACTUATORS:
                                </Text>{' '}
                                <Text style={{ color: UI_ACCENT_GREEN }}>{actuatorCount}</Text>
                            </Col>
                            <Col span={8}>
                                <Text strong style={{ color: '#fff' }}>
                                    PRESSURE SENSORS:
                                </Text>{' '}
                                <Text style={{ color: UI_ACCENT_GREEN }}>{sensorPressureCount}</Text>
                            </Col>
                        </Row>
                    </Card>
                </Space>
            </Modal>

            <Modal
                title={
                    <Title level={4} style={{ color: UI_ACCENT_GREEN, margin: 0 }}>
                        <FolderOpenOutlined /> LOAD HARDWARE CONFIGURATION
                    </Title>
                }
                open={loadModalVisible}
                footer={[
                    <Button key="close" onClick={() => setLoadModalVisible(false)} style={outlineBtnStyle}>
                        CLOSE
                    </Button>,
                ]}
                onCancel={() => setLoadModalVisible(false)}
                width={720}
                style={{ top: 50 }}
                styles={modalStyles}
                className="dark-modal"
            >
                <Space direction="vertical" style={{ width: '100%', marginBottom: 12 }} size="small">
                    <Text style={{ color: '#888', fontSize: 12 }}>
                        TOOLBAR TARGET FOR ACTIVATE / DELETE:{' '}
                        <Text style={{ color: UI_ACCENT_GREEN }}>{toolbarTargetConfig.trim() || '—'}</Text>
                    </Text>
                    <Button
                        size="small"
                        icon={<ReloadOutlined spin={configListLoading} />}
                        disabled={!isConnected || configListLoading}
                        onClick={() => void onRefreshConfigList()}
                        style={outlineBtnStyle}
                    >
                        REFRESH
                    </Button>
                </Space>

                {!isConnected ? (
                    <Card style={{ textAlign: 'center', ...UI_CARD_SURFACE_STYLE }}>
                        <Text style={{ color: '#888' }}>CONNECT TO ROS BRIDGE FIRST.</Text>
                    </Card>
                ) : (
                    <List
                        dataSource={activeRows}
                        renderItem={(row) => {
                            const isActiveRow = row.key === '__active__';
                            const rowBusy = busyLoadId !== null && busyLoadId === row.loadArg;
                            return (
                                <List.Item
                                    key={row.key}
                                    style={{
                                        backgroundColor: '#0c0c0c',
                                        marginBottom: 8,
                                        borderRadius: 4,
                                        padding: 12,
                                        border: `1px solid ${UI_BORDER_MUTED}`,
                                    }}
                                    actions={[
                                        <Tooltip key="load" title="FETCH YAML INTO THE EDITOR">
                                            <Button
                                                type="primary"
                                                icon={<DownloadOutlined />}
                                                loading={loadingConfig && rowBusy}
                                                disabled={loadingConfig && busyLoadId !== row.loadArg}
                                                onClick={() => void handleLoadConfig(row.loadArg)}
                                                style={UI_PRIMARY_GREEN_BUTTON_STYLE}
                                            >
                                                LOAD
                                            </Button>
                                        </Tooltip>,
                                        <Tooltip key="target" title="ONLY SET ACTIVATE / DELETE TARGET (NO FETCH)">
                                            <Button
                                                icon={<AimOutlined />}
                                                disabled={loadingConfig}
                                                onClick={() => {
                                                    const targetName = isActiveRow ? activeConfigName.trim() : row.loadArg;
                                                    onToolbarTargetConfigChange(targetName);
                                                    message.info(
                                                        isActiveRow && !targetName
                                                            ? 'TOOLBAR TARGET: ACTIVE CONFIGURATION'
                                                            : `TOOLBAR TARGET: "${targetName}"`,
                                                    );
                                                }}
                                                style={outlineBtnStyle}
                                            >
                                                TARGET
                                            </Button>
                                        </Tooltip>,
                                    ]}
                                >
                                    <List.Item.Meta
                                        title={
                                            <Space size={8}>
                                                <Text strong style={{ fontSize: 16, color: UI_ACCENT_GREEN }}>
                                                    {row.title}
                                                </Text>
                                                {(isActiveRow
                                                    ? Boolean(activeConfigName.trim()) &&
                                                      activeConfigName.trim() === toolbarTargetConfig.trim()
                                                    : row.loadArg === toolbarTargetConfig.trim()) ? (
                                                    <Text style={{ color: UI_WARNING_AMBER, fontSize: 11 }}>TARGET</Text>
                                                ) : null}
                                            </Space>
                                        }
                                        description={
                                            <Space direction="vertical" size={4}>
                                                <Space>
                                                    <CloudDownloadOutlined style={{ color: '#888' }} />
                                                    <Text style={{ color: '#888' }}>{row.subtitle}</Text>
                                                </Space>
                                            </Space>
                                        }
                                    />
                                </List.Item>
                            );
                        }}
                    />
                )}
            </Modal>
        </>
    );
};
