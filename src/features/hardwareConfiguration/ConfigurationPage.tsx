import {
    Alert,
    Button,
    Card,
    Modal,
    Select,
    Space,
    Table,
    Tag,
    Typography,
} from 'antd';
import { DeleteOutlined, PlusOutlined, ReloadOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { Page } from '../../Components/Page.tsx';
import { HardwareYamlConfigManager } from '../../Components/HardwareYamlConfigManager.tsx';
import { LucyControlPanelHeader } from '../../Components/LucyControlPanelHeader.tsx';
import { UNPARSED_VALIDATION_KEY, GENERAL_VALIDATION_KEY } from '../../Utils/hardwareConfigServerErrors.ts';
import { UI_CARD_SURFACE_STYLE, UI_PRIMARY_GREEN_BUTTON_STYLE } from '../../Constants/uiTheme.ts';
import './configuration.switch.css';
import { useHardwareConfiguration } from './hooks/useHardwareConfiguration.tsx';
import { freePhysicalPinsOnBoard } from './model/documentHelpers.ts';

const { Text } = Typography;

const ConfigurationPage = () => {
    const [modal, contextHolder] = Modal.useModal();
    const hw = useHardwareConfiguration(modal);

    const headerContent = (
        <LucyControlPanelHeader>
            <Space wrap>
                <Tag title="Top-level robot_name from the loaded hardware YAML">
                    <span style={{ fontWeight: 600 }}>ROBOT:</span> {hw.hardwareRobotName || '—'}
                </Tag>
                <Tag color="cyan" title="Current active hardware configuration from config/list">
                    <span style={{ fontWeight: 600 }}>ACTIVE:</span> {hw.serverActiveConfigName || '—'}
                </Tag>
                {hw.resolvedName ? (
                    <Tag>
                        <span style={{ fontWeight: 600 }}>LOADED:</span> {hw.resolvedName}
                    </Tag>
                ) : null}
                {hw.isDirty ? <Tag color="orange">UNSAVED EDITS</Tag> : null}
            </Space>
        </LucyControlPanelHeader>
    );

    return (
        <Page showHeader headerContent={headerContent} contentStyle={{ padding: 12, position: 'relative' }} removeScrollbars={false}>
            {contextHolder}
            {hw.contextHolderMessage}

            <div
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    width: '100%',
                    marginBottom: 12,
                }}
            >
                <Space wrap align="center">
                    <HardwareYamlConfigManager
                        isConnected={hw.isConnected}
                        yamlDoc={hw.yamlDoc}
                        isDirty={hw.isDirty}
                        saving={hw.saving}
                        loadingConfig={hw.loading}
                        hardwareRobotName={hw.hardwareRobotName}
                        actuatorCount={hw.actuatorRows.length}
                        sensorPressureCount={hw.pressureSensorRows.length}
                        savedConfigNames={hw.savedConfigNames}
                        activeConfigName={hw.serverActiveConfigName}
                        configListLoading={hw.configListLoading}
                        toolbarTargetConfig={hw.loadConfigName}
                        onToolbarTargetConfigChange={hw.setLoadConfigName}
                        onRefreshConfigList={hw.refreshConfigListForModal}
                        onSaveConfig={hw.saveConfigByName}
                        onLoadConfig={(name) => hw.loadHardwareConfig(name, { successToast: false })}
                    />
                    <Button icon={<ReloadOutlined />} disabled={!hw.loadedSnapshot} onClick={hw.handleRevert}>
                        REVERT
                    </Button>
                </Space>
                <Space wrap align="center">
                    <Button
                        type="primary"
                        icon={<ThunderboltOutlined />}
                        loading={hw.activating}
                        disabled={!hw.canActivateConfig}
                        onClick={hw.handleActivateClick}
                        style={UI_PRIMARY_GREEN_BUTTON_STYLE}
                    >
                        ACTIVATE
                    </Button>
                    <Button
                        danger
                        icon={<DeleteOutlined />}
                        loading={hw.deleting}
                        disabled={!hw.canDeleteConfig}
                        onClick={hw.handleDeleteClick}
                    >
                        DELETE
                    </Button>
                    <Text type="secondary" style={{ fontFamily: 'monospace' }}>
                        <span style={{ fontWeight: 600 }}>TARGET:</span>{' '}
                        <Text code>{hw.selectedTargetConfigName || '—'}</Text>
                    </Text>
                </Space>
            </div>

            {!hw.yamlDoc ? (
                <Alert
                    type="info"
                    message={
                        hw.loading
                            ? 'LOADING HARDWARE CONFIGURATION…'
                            : 'CONNECT TO ROS SYSTEM FIRST'
                    }
                    showIcon
                />
            ) : null}

            {hw.serverErrorRows.length > 0 ? (
                <Alert
                    type="error"
                    style={{ marginBottom: 12 }}
                    message="SYSTEM VALIDATION (FROM CONFIG/SAVE)"
                    description={
                        <div style={{ maxHeight: 220, overflow: 'auto' }}>
                            <ul style={{ marginBottom: 8, paddingLeft: 18 }}>
                                {hw.serverErrorRows.map((row, i) => (
                                    <li key={`${row.field}-${i}`}>
                                        {row.field === UNPARSED_VALIDATION_KEY ? (
                                            <Text code>raw</Text>
                                        ) : row.field === GENERAL_VALIDATION_KEY ? (
                                            <Text code>general</Text>
                                        ) : (
                                            <Text code>{row.field}</Text>
                                        )}
                                        : {row.message}
                                    </li>
                                ))}
                            </ul>
                            {hw.lastValidationLines.length > 0 ? (
                                <Text type="secondary" style={{ fontSize: 11 }}>
                                    BACKEND RETURNED {hw.lastValidationLines.length} LINE(S); STRUCTURED ROWS PARSE JSON METADATA WHERE
                                    PRESENT.
                                </Text>
                            ) : null}
                        </div>
                    }
                    showIcon
                />
            ) : null}

            {hw.urdfWarnings.length > 0 ? (
                <Alert
                    type="warning"
                    style={{ marginBottom: 12 }}
                    message="URDF CROSS-CHECK WARNINGS (SAVED ANYWAY IF SUCCESS)"
                    description={
                        <ul style={{ marginBottom: 0, paddingLeft: 18 }}>
                            {hw.urdfWarnings.map((w, i) => (
                                <li key={i}>{w}</li>
                            ))}
                        </ul>
                    }
                    showIcon
                />
            ) : null}

            {hw.yamlDoc ? (
                <>
                    <Card title="BOARDS (READ-ONLY)" size="small" style={{ marginBottom: 12, ...UI_CARD_SURFACE_STYLE }}>
                        <Table size="small" dataSource={hw.boardRows} columns={hw.boardColumns} pagination={false} />
                    </Card>

                    <Card
                        title="ACTUATORS"
                        size="small"
                        style={{ marginBottom: 12, ...UI_CARD_SURFACE_STYLE }}
                        extra={
                            <Space wrap align="center" size="small">
                                <Select
                                    size="small"
                                    placeholder="BOARD"
                                    style={{ minWidth: 200 }}
                                    disabled={!hw.yamlDoc || hw.boardsEligibleForNewActuator.length === 0}
                                    value={hw.addActuatorBoard}
                                    options={hw.boardsEligibleForNewActuator.map((b) => ({
                                        value: b,
                                        label: `${b} (${
                                            hw.yamlDoc ? freePhysicalPinsOnBoard(hw.yamlDoc, b).length : 0
                                        } free)`,
                                    }))}
                                    onChange={(v) => hw.setAddActuatorBoard(v)}
                                />
                                <Button
                                    type="default"
                                    size="small"
                                    className="hardware-config-add-btn"
                                    disabled={!hw.yamlDoc || !hw.addActuatorBoard}
                                    onClick={hw.handleAddActuator}
                                    style={{ minWidth: 132 }}
                                    title={
                                        !hw.yamlDoc || !hw.addActuatorBoard
                                            ? 'Choose a board with a free pin, then add an actuator.'
                                            : undefined
                                    }
                                >
                                    <Space size={6}>
                                        <PlusOutlined />
                                        <span>ADD ACTUATOR</span>
                                    </Space>
                                </Button>
                                {hw.yamlDoc && hw.boardsEligibleForNewActuator.length === 0 ? (
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        NO FREE PINS ON ANY BOARD
                                    </Text>
                                ) : null}
                            </Space>
                        }
                    >
                        <Table
                            size="small"
                            scroll={{ x: true }}
                            pagination={false}
                            dataSource={hw.actuatorRows}
                            columns={hw.actuatorColumns}
                        />
                    </Card>

                    <Card
                        title="FINGER PRESSURE SENSORS"
                        size="small"
                        style={UI_CARD_SURFACE_STYLE}
                        extra={
                            <Space wrap align="center" size="small">
                                <Select
                                    size="small"
                                    placeholder="ACTUATOR TO ATTACH"
                                    style={{ minWidth: 260 }}
                                    showSearch
                                    optionFilterProp="label"
                                    disabled={!hw.yamlDoc || hw.actuatorsEligibleForNewPressureSensor.length === 0}
                                    value={hw.addPressureSensorActuatorId}
                                    allowClear
                                    options={hw.actuatorsEligibleForNewPressureSensor}
                                    onChange={(v) => hw.setAddPressureSensorActuatorId(v)}
                                />
                                <Button
                                    type="default"
                                    size="small"
                                    className="hardware-config-add-btn"
                                    disabled={!hw.yamlDoc || !hw.addPressureSensorActuatorId}
                                    onClick={hw.handleAddPressureSensor}
                                    style={{ minWidth: 118 }}
                                    title={
                                        !hw.yamlDoc || !hw.addPressureSensorActuatorId
                                            ? 'Choose an actuator on a board with a free pin, then add a sensor.'
                                            : undefined
                                    }
                                >
                                    <Space size={6}>
                                        <PlusOutlined />
                                        <span>ADD SENSOR</span>
                                    </Space>
                                </Button>
                                {hw.yamlDoc && hw.actuatorsEligibleForNewPressureSensor.length === 0 ? (
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        NO ACTUATOR WITH A FREE PIN ON ITS BOARD
                                    </Text>
                                ) : null}
                            </Space>
                        }
                    >
                        <Table
                            size="small"
                            scroll={{ x: true }}
                            pagination={false}
                            dataSource={hw.pressureSensorRows}
                            columns={hw.pressureSensorColumns}
                        />
                    </Card>
                </>
            ) : null}
        </Page>
    );
};

export default ConfigurationPage;
