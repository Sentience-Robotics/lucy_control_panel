import { Alert, Button, Card, Input, Select, Space, Table, Tag, Tooltip, Typography } from 'antd';
import { PlusOutlined, ReloadOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { Page } from '../../Components/Page.tsx';
import { HardwareConfigPresetHeaderTag } from '../../Components/HardwareConfigPresetTag.tsx';
import { HardwareYamlConfigManager } from '../../Components/HardwareYamlConfigManager.tsx';
import { LucyLoader } from '../../Components/LucyLoader.tsx';
import { UNPARSED_VALIDATION_KEY, GENERAL_VALIDATION_KEY } from '../../Utils/hardwareConfigServerErrors.ts';
import { UI_CARD_SURFACE_STYLE, UI_PRIMARY_GREEN_BUTTON_STYLE } from '../../Constants/uiTheme.ts';
import './configuration.switch.css';
import { ActivateConfigureWorkflowModal } from './components/ActivateConfigureWorkflowModal.tsx';
import { useHardwareConfiguration } from './hooks/useHardwareConfiguration.tsx';
import { freePhysicalPinsOnBoard } from './model/documentHelpers.ts';

const { Text } = Typography;

const ConfigurationPage = () => {
    const hw = useHardwareConfiguration();
    const editorLocked = hw.editorLocked;

    return (
        <Page
            showHeader
            title
            contentStyle={{ padding: 12, position: 'relative' }}
            removeScrollbars={false}
        >
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
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'auto auto',
                        columnGap: 12,
                        rowGap: 6,
                        alignItems: 'center',
                    }}
                >
                    <span style={{ gridColumn: 1, gridRow: 1 }} aria-hidden />
                    <div style={{ gridColumn: 2, gridRow: 1 }}>
                        <HardwareConfigPresetHeaderTag
                            variant="loaded"
                            label="LOADED"
                            value={hw.resolvedName || ''}
                            title="Configuration YAML currently open in the editor"
                        />
                    </div>
                    <Tag
                        title="ROS package wired on lucy_config_pipeline (from config/get)"
                        style={{ gridColumn: 1, gridRow: 2, margin: 0 }}
                    >
                        <span style={{ fontWeight: 600 }}>ROBOT PACKAGE:</span> {hw.serverRobotPackage || '—'}
                    </Tag>
                    <div style={{ gridColumn: 2, gridRow: 2 }}>
                        <HardwareConfigPresetHeaderTag
                            variant="active"
                            label="ACTIVE"
                            value={hw.serverActiveConfigName || ''}
                            title="Current active hardware configuration from config/list"
                        />
                    </div>
                    <span style={{ gridColumn: 1, gridRow: 3 }} aria-hidden />
                    <div style={{ gridColumn: 2, gridRow: 3 }}>
                        <HardwareConfigPresetHeaderTag
                            variant="flashed"
                            label="FLASHED"
                            value={hw.serverFlashedConfigName || ''}
                            title={
                                hw.serverFlashedAt
                                    ? `Last successful pipeline flash (UTC): ${hw.serverFlashedAt}`
                                    : 'Preset last written to boards via configure_pipeline flash (from active_meta / config/get)'
                            }
                        />
                    </div>
                </div>
                <Space wrap align="center">
                    <Button
                        icon={<ReloadOutlined />}
                        disabled={!hw.loadedSnapshot || editorLocked}
                        onClick={hw.handleRevert}
                    >
                        REVERT
                    </Button>
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
                        flashedConfigName={hw.serverFlashedConfigName}
                        configListLoading={hw.configListLoading}
                        toolbarTargetConfig={hw.loadConfigName}
                        onToolbarTargetConfigChange={hw.setLoadConfigName}
                        onRefreshConfigList={hw.refreshConfigListForModal}
                        onSaveConfig={hw.saveConfigByName}
                        onLoadConfig={(name) => hw.loadHardwareConfig(name, { successToast: false })}
                        deleteConfigByName={hw.deleteConfigByName}
                        deletingConfig={hw.deleting}
                        workflowLocked={editorLocked}
                    />
                    {hw.isDirty ? <Tag color="orange">UNSAVED EDITS</Tag> : null}
                </Space>
                <Space wrap align="center">
                    <HardwareConfigPresetHeaderTag
                        variant="target"
                        label="TARGET"
                        value={hw.selectedTargetConfigName || ''}
                    />
                    <Tooltip title="Activate & configure the TARGET preset on the robot">
                        <Button
                            type="primary"
                            icon={<ThunderboltOutlined />}
                            loading={hw.workflowRunning}
                            onClick={hw.openActivateModal}
                            style={UI_PRIMARY_GREEN_BUTTON_STYLE}
                        >
                            ACTIVATE
                        </Button>
                    </Tooltip>
                </Space>
            </div>

            {!hw.yamlDoc ? (
                <LucyLoader
                    label={hw.loading ? 'LOADING HARDWARE CONFIGURATION' : 'WAITING FOR ROS BRIDGE'}
                    detail={
                        hw.loading
                            ? 'Fetching the active hardware preset and joint catalog.'
                            : 'Use Quick Connect in the header — the configuration loads automatically once linked.'
                    }
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

            <ActivateConfigureWorkflowModal
                open={hw.activateModalOpen}
                onClose={hw.closeActivateModal}
                isDirty={hw.isDirty}
                selectedTargetConfigName={hw.selectedTargetConfigName}
                serverActiveConfigName={hw.serverActiveConfigName}
                serverRobotPackage={hw.serverRobotPackage}
                pipelineBoardOptions={hw.pipelineBoardOptions}
                activateModalBoards={hw.activateModalBoards}
                onActivateModalBoardsChange={hw.setActivateModalBoards}
                activateModalBuildOnly={hw.activateModalBuildOnly}
                onActivateModalBuildOnlyChange={hw.setActivateModalBuildOnly}
                activateModalActivateOnly={hw.activateModalActivateOnly}
                onActivateModalActivateOnlyChange={hw.setActivateModalActivateOnly}
                activateModalSimulationOnly={hw.activateModalSimulationOnly}
                onActivateModalSimulationOnlyChange={hw.setActivateModalSimulationOnly}
                onRun={hw.runWorkflowFromModal}
                onAbort={hw.abortWorkflow}
                workflowRunning={hw.workflowRunning}
                workflowSteps={hw.workflowSteps}
                workflowOverallPercent={hw.workflowOverallPercent}
                workflowDetailLine={hw.workflowDetailLine}
                workflowLastRunSucceeded={hw.workflowLastRunSucceeded}
                workflowLastRunDiff={hw.workflowLastRunDiff}
                gazeboRunning={hw.gazeboRunning}
                canRun={hw.modalCanRun && hw.isConnected}
            />

            {hw.yamlDoc ? (
                <div
                    style={
                        editorLocked
                            ? { pointerEvents: 'none', opacity: 0.55, transition: 'opacity 0.2s ease' }
                            : undefined
                    }
                >
                    <Card title="BOARDS (READ-ONLY)" size="small" style={{ marginBottom: 12, ...UI_CARD_SURFACE_STYLE }}>
                        <Table size="small" dataSource={hw.boardRows} columns={hw.boardColumns} pagination={false} />
                    </Card>

                    <Card
                        title="ACTUATORS"
                        size="small"
                        style={{ marginBottom: 12, ...UI_CARD_SURFACE_STYLE }}
                        extra={
                            <Space wrap align="center" size="small">
                                <Input.Search
                                    placeholder="Search actuators"
                                    value={hw.actuatorSearchQuery}
                                    onChange={(e) => hw.setActuatorSearchQuery(e.target.value)}
                                    style={{ width: 200 }}
                                    allowClear
                                />
                                <Select
                                    size="small"
                                    placeholder="BOARD"
                                    style={{ minWidth: 200 }}
                                    disabled={
                                        editorLocked ||
                                        !hw.yamlDoc ||
                                        hw.boardsEligibleForNewActuator.length === 0
                                    }
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
                                    disabled={editorLocked || !hw.yamlDoc || !hw.addActuatorBoard}
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
                                    disabled={
                                        editorLocked ||
                                        !hw.yamlDoc ||
                                        hw.actuatorsEligibleForNewPressureSensor.length === 0
                                    }
                                    value={hw.addPressureSensorActuatorId}
                                    allowClear
                                    options={hw.actuatorsEligibleForNewPressureSensor}
                                    onChange={(v) => hw.setAddPressureSensorActuatorId(v)}
                                />
                                <Button
                                    type="default"
                                    size="small"
                                    className="hardware-config-add-btn"
                                    disabled={editorLocked || !hw.yamlDoc || !hw.addPressureSensorActuatorId}
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
                </div>
            ) : null}
        </Page>
    );
};

export default ConfigurationPage;
