import React, { useCallback, useState } from 'react';
import {
    Button,
    Card,
    Col,
    Input,
    List,
    Modal,
    Popconfirm,
    Row,
    Space,
    Tooltip,
    Typography,
    message,
} from 'antd';
import { HardwareConfigPresetRoleTag } from './HardwareConfigPresetTag.tsx';
import {
    AimOutlined,
    CloudDownloadOutlined,
    DeleteOutlined,
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
    UI_COLOR_TRANSPARENT,
    UI_INPUT_SURFACE,
    UI_LIST_ROW_BG,
    UI_MODAL_MASK_BG,
    UI_PRIMARY_GREEN_BUTTON_STYLE,
    UI_TEXT_PRIMARY_ON_DARK,
    UI_TEXT_SUBTLE,
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
    /** Last pipeline-flashed preset (from config/get / active_meta); shown in load list. */
    flashedConfigName: string;
    configListLoading: boolean;
    /** Selection used by ACTIVATE workflow on the parent page */
    toolbarTargetConfig: string;
    onToolbarTargetConfigChange: (configName: string) => void;
    onRefreshConfigList: () => void | Promise<void>;
    deleteConfigByName: (configName: string) => Promise<boolean>;
    deletingConfig: boolean;
    onSaveConfig: (trimmedName: string) => Promise<boolean>;
    /** Named configuration file, or empty string for active */
    onLoadConfig: (configName: string) => Promise<boolean>;
    /** Blocks save/load UI (e.g. while ConfigurePipeline is running). */
    workflowLocked?: boolean;
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
    flashedConfigName,
    configListLoading,
    toolbarTargetConfig,
    onToolbarTargetConfigChange,
    onRefreshConfigList,
    deleteConfigByName,
    deletingConfig,
    onSaveConfig,
    onLoadConfig,
    workflowLocked = false,
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
                    message.success(`LOADED CONFIGURATION "${configKey.trim()}"`);
                    setLoadModalVisible(false);
                }
            } finally {
                setBusyLoadId(null);
            }
        },
        [onLoadConfig],
    );

    const modalStyles = {
        mask: { backgroundColor: UI_MODAL_MASK_BG },
    };

    const inputDarkStyle = {
        backgroundColor: UI_INPUT_SURFACE,
        borderColor: UI_BORDER_SOFT,
        color: UI_TEXT_PRIMARY_ON_DARK,
    };

    const outlineBtnStyle = {
        backgroundColor: UI_COLOR_TRANSPARENT,
        borderColor: UI_BORDER_SOFT,
        color: UI_TEXT_PRIMARY_ON_DARK,
    };

    const activeTrim = activeConfigName.trim();
    const flashedTrim = flashedConfigName.trim();

    const canDeletePresetFile = useCallback(
        (presetName: string) => {
            const n = presetName.trim();
            if (!n || workflowLocked || !isConnected || deletingConfig) return false;
            if (n === 'default') return false;
            if (n === activeTrim) return false;
            return true;
        },
        [activeTrim, deletingConfig, isConnected, workflowLocked],
    );

    const sortedUnique = [...new Set(savedConfigNames.map((s) => s.trim()).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b),
    );

    /** Active preset first when known; otherwise alphabetical. Includes active name even if missing from list yet. */
    let orderedPresets: string[];
    if (activeTrim && sortedUnique.includes(activeTrim)) {
        orderedPresets = [activeTrim, ...sortedUnique.filter((n) => n !== activeTrim)];
    } else if (activeTrim) {
        orderedPresets = [activeTrim, ...sortedUnique];
    } else {
        orderedPresets = sortedUnique;
    }

    const presetRows = orderedPresets.map((name) => ({ key: name, name }));

    return (
        <>
            <Space>
                <Button
                    icon={<FolderOpenOutlined />}
                    disabled={workflowLocked || !isConnected}
                    onClick={() => setLoadModalVisible(true)}
                    style={outlineBtnStyle}
                >
                    LOAD CONFIG{' '}
                    {savedConfigCount > 0 ? <span style={{ color: UI_ACCENT_GREEN }}>({savedConfigCount})</span> : null}
                </Button>

                <Button
                    icon={<SaveOutlined />}
                    disabled={workflowLocked || !isConnected || !yamlDoc || !isDirty}
                    onClick={() => setSaveModalVisible(true)}
                    style={outlineBtnStyle}
                >
                    SAVE CONFIG
                </Button>
            </Space>

            <Modal
                title={
                    <Title level={4} style={{ color: UI_ACCENT_GREEN, margin: 0 }}>
                        <SaveOutlined /> SAVE ROBOT CONFIGURATION
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
                destroyOnClose
            >
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                    {!isDirty && !saving ? (
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
                        <Text style={{ color: UI_TEXT_SUBTLE, fontSize: 12, marginBottom: 8, display: 'block' }}>
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
                                        borderColor: UI_BORDER_SOFT,
                                        color: UI_TEXT_SUBTLE,
                                        backgroundColor: UI_COLOR_TRANSPARENT,
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
                                <Text strong style={{ color: UI_TEXT_PRIMARY_ON_DARK }}>
                                    ROBOT_NAME:
                                </Text>{' '}
                                <Text style={{ color: UI_ACCENT_GREEN }}>{hardwareRobotName || '—'}</Text>
                            </Col>
                            <Col span={8}>
                                <Text strong style={{ color: UI_TEXT_PRIMARY_ON_DARK }}>
                                    ACTUATORS:
                                </Text>{' '}
                                <Text style={{ color: UI_ACCENT_GREEN }}>{actuatorCount}</Text>
                            </Col>
                            <Col span={8}>
                                <Text strong style={{ color: UI_TEXT_PRIMARY_ON_DARK }}>
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
                        <FolderOpenOutlined /> LOAD ROBOT CONFIGURATION
                    </Title>
                }
                open={loadModalVisible}
                footer={
                    <Button onClick={() => setLoadModalVisible(false)} style={outlineBtnStyle}>
                        CLOSE
                    </Button>
                }
                onCancel={() => setLoadModalVisible(false)}
                width={720}
                style={{ top: 50 }}
                styles={modalStyles}
                className="dark-modal"
            >
                <Space direction="vertical" style={{ width: '100%', marginBottom: 12 }} size="small">
                    <Button
                        size="small"
                        icon={<ReloadOutlined spin={configListLoading} />}
                        disabled={workflowLocked || !isConnected || configListLoading}
                        onClick={() => void onRefreshConfigList()}
                        style={outlineBtnStyle}
                    >
                        REFRESH
                    </Button>
                </Space>

                {!isConnected ? (
                    <Card style={{ textAlign: 'center', ...UI_CARD_SURFACE_STYLE }}>
                        <Text style={{ color: UI_TEXT_SUBTLE }}>CONNECT TO ROS BRIDGE FIRST.</Text>
                    </Card>
                ) : (
                    <List
                        dataSource={presetRows}
                        locale={{
                            emptyText: (
                                <Text type="secondary">
                                    NO PRESETS FROM CONFIG/LIST — TRY REFRESH OR CHECK ROBOT CONNECTION.
                                </Text>
                            ),
                        }}
                        renderItem={(row) => {
                            const name = row.name;
                            const rowBusy = busyLoadId !== null && busyLoadId === name;
                            const isRobotActive = Boolean(activeTrim) && name === activeTrim;
                            const isFlashedPreset = Boolean(flashedTrim) && name === flashedTrim;
                            const isActivateTarget = name === toolbarTargetConfig.trim();
                            const showRowDelete = !isRobotActive;

                            return (
                                <List.Item
                                    key={row.key}
                                    style={{
                                        backgroundColor: UI_LIST_ROW_BG,
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
                                                disabled={
                                                    workflowLocked || (loadingConfig && busyLoadId !== name)
                                                }
                                                onClick={() => void handleLoadConfig(name)}
                                                style={UI_PRIMARY_GREEN_BUTTON_STYLE}
                                            >
                                                LOAD
                                            </Button>
                                        </Tooltip>,
                                        <Tooltip key="target" title="SET AS TARGET FOR ACTIVATE WORKFLOW">
                                            <Button
                                                icon={<AimOutlined />}
                                                disabled={workflowLocked || loadingConfig}
                                                onClick={() => {
                                                    onToolbarTargetConfigChange(name);
                                                    message.info(`TOOLBAR TARGET: "${name}"`);
                                                }}
                                                style={outlineBtnStyle}
                                            >
                                                TARGET
                                            </Button>
                                        </Tooltip>,
                                        ...(showRowDelete
                                            ? [
                                                  <Popconfirm
                                                      key="del-preset"
                                                      title="DELETE ?"
                                                      okText="DELETE"
                                                      cancelText="CANCEL"
                                                      okButtonProps={{ danger: true }}
                                                      onConfirm={() => void deleteConfigByName(name)}
                                                  >
                                                      <Button
                                                          type="text"
                                                          size="small"
                                                          danger
                                                          icon={<DeleteOutlined />}
                                                          aria-label={`Delete configuration ${name}`}
                                                          disabled={
                                                              !canDeletePresetFile(name) ||
                                                              workflowLocked ||
                                                              loadingConfig
                                                          }
                                                      />
                                                  </Popconfirm>,
                                              ]
                                            : []),
                                    ]}
                                >
                                    <List.Item.Meta
                                        title={
                                            <Space size={8} wrap>
                                                <Text strong style={{ fontSize: 16, color: UI_ACCENT_GREEN }}>
                                                    {name.toUpperCase()}
                                                </Text>
                                                {isRobotActive ? (
                                                    <HardwareConfigPresetRoleTag variant="active" />
                                                ) : null}
                                                {isFlashedPreset ? (
                                                    <HardwareConfigPresetRoleTag variant="flashed" />
                                                ) : null}
                                                {isActivateTarget ? (
                                                    <HardwareConfigPresetRoleTag variant="target" />
                                                ) : null}
                                            </Space>
                                        }
                                        description={
                                            <Space size={4}>
                                                <CloudDownloadOutlined style={{ color: UI_TEXT_SUBTLE }} />
                                                <Text style={{ color: UI_TEXT_SUBTLE, fontSize: 12 }}>
                                                    config/hardware/configs/{name}.yaml
                                                </Text>
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
