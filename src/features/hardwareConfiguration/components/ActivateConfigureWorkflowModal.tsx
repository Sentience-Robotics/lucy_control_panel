import {
    CheckCircleOutlined,
    CloseCircleOutlined,
    LoadingOutlined,
    MinusCircleOutlined,
    ThunderboltOutlined,
    WarningOutlined,
} from '@ant-design/icons';
import { Alert, Button, Card, Checkbox, Divider, Modal, Progress, Space, Switch, Tag, Typography } from 'antd';
import type { HardwareConfigDiff } from '../model/hardwareConfigDiff.ts';
import type { GeneratedFileNames } from '../../../Utils/generatedFiles.ts';
import { HardwareConfigPresetHeaderTag } from '../../../Components/HardwareConfigPresetTag.tsx';
import {
    UI_ACCENT_GREEN,
    UI_BORDER_MUTED,
    UI_BORDER_SOFT,
    UI_CARD_SURFACE_STYLE,
    UI_ERROR,
    UI_MODAL_MASK_BG,
    UI_PRIMARY_GREEN_BUTTON_STYLE,
    UI_TEXT_PRIMARY_ON_DARK,
    UI_TEXT_SECONDARY_MUTED,
    UI_TEXT_SUBTLE,
    UI_WARNING,
} from '../../../Constants/uiTheme.ts';
import type { WorkflowStepRuntimeStatus, WorkflowStepSlice } from '../activateWorkflowStepTypes.ts';
import '../configuration.switch.css';

const { Text, Title } = Typography;

const modalStyles = {
    mask: { backgroundColor: UI_MODAL_MASK_BG },
};

function stepIcon(status: WorkflowStepRuntimeStatus) {
    if (status === 'done') return <CheckCircleOutlined style={{ color: UI_ACCENT_GREEN }} />;
    if (status === 'error') return <CloseCircleOutlined style={{ color: UI_ERROR }} />;
    if (status === 'skipped') return <MinusCircleOutlined style={{ color: UI_TEXT_SECONDARY_MUTED }} />;
    if (status === 'running') return <LoadingOutlined style={{ color: UI_ACCENT_GREEN }} />;
    return (
        <span
            style={{
                display: 'inline-block',
                width: 14,
                height: 14,
                borderRadius: '50%',
                border: `2px solid ${UI_BORDER_SOFT}`,
            }}
        />
    );
}

export interface ActivateConfigureWorkflowModalProps {
    open: boolean;
    onClose: () => void;
    isDirty: boolean;
    selectedTargetConfigName: string;
    serverActiveConfigName: string;
    serverRobotPackage: string;
    pipelineBoardOptions: { label: string; value: string }[];
    activateModalBoards: string[];
    onActivateModalBoardsChange: (ids: string[]) => void;
    activateModalBuildOnly: boolean;
    onActivateModalBuildOnlyChange: (v: boolean) => void;
    activateModalActivateOnly: boolean;
    onActivateModalActivateOnlyChange: (v: boolean) => void;
    activateModalSimulationOnly: boolean;
    onActivateModalSimulationOnlyChange: (v: boolean) => void;
    /** Primary action */
    onRun: () => void | Promise<void>;
    onAbort: () => void;
    workflowRunning: boolean;
    workflowSteps: WorkflowStepSlice[];
    workflowOverallPercent: number;
    workflowDetailLine: string;
    /** True once the most recent run finished successfully (and no new run started). */
    workflowLastRunSucceeded: boolean;
    /**
     * Structural diff between the active doc captured before the run and the
     * target preset. `null` when not enough info to compute (e.g. server fetch failed).
     */
    workflowLastRunDiff: HardwareConfigDiff | null;
    /**
     * `true` if Gazebo is part of the active launch graph (latched signal
     * from `lucy_control_supervisor`). `false` if known not to be. `null` if unknown.
     */
    gazeboRunning: boolean | null;
    canRun: boolean;
    /**
     * Generated-artifact filenames resolved from the active hardware doc
     * (`generated_files` in the YAML). Keeps the regenerate copy in sync with
     * what the pipeline actually writes instead of hardcoding names.
     */
    generatedFileNames: GeneratedFileNames;
}

export function ActivateConfigureWorkflowModal(props: ActivateConfigureWorkflowModalProps) {
    const {
        open,
        onClose,
        isDirty,
        selectedTargetConfigName,
        serverActiveConfigName,
        serverRobotPackage,
        pipelineBoardOptions,
        activateModalBoards,
        onActivateModalBoardsChange,
        activateModalBuildOnly,
        onActivateModalBuildOnlyChange,
        activateModalActivateOnly,
        onActivateModalActivateOnlyChange,
        activateModalSimulationOnly,
        onActivateModalSimulationOnlyChange,
        onRun,
        onAbort,
        workflowRunning,
        workflowSteps,
        workflowOverallPercent,
        workflowDetailLine,
        workflowLastRunSucceeded,
        workflowLastRunDiff,
        gazeboRunning,
        canRun,
        generatedFileNames,
    } = props;

    // A pipeline run always rebuilds the model the running Gazebo loaded, so if
    // Gazebo is up after a successful run it must be restarted regardless of diff.
    const showGazeboRestartPrompt =
        !workflowRunning &&
        workflowLastRunSucceeded &&
        gazeboRunning === true;

    return (
        <Modal
            title={
                <Title level={4} style={{ color: UI_ACCENT_GREEN, margin: 0 }}>
                    <ThunderboltOutlined /> ACTIVATE &amp; CONFIGURE
                </Title>
            }
            open={open}
            onCancel={workflowRunning ? () => { } : onClose}
            footer={null}
            keyboard={!workflowRunning}
            width={720}
            style={{ top: 48 }}
            styles={modalStyles}
            className="dark-modal"
            maskClosable={!workflowRunning}
            closable={!workflowRunning}
            destroyOnClose={false}
        >
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
                {serverActiveConfigName && serverActiveConfigName !== selectedTargetConfigName ? (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Current active on system: <Text code>{serverActiveConfigName}</Text>
                    </Text>
                ) : null}
                {isDirty ? (
                    <Text type="warning" style={{ fontSize: 12 }}>
                        Unsaved editor changes — this workflow uses files already saved on the system. Save first if
                        needed.
                    </Text>
                ) : null}

                <div>
                    <Switch
                        className="hardware-config-ant-switch"
                        checked={activateModalSimulationOnly}
                        onChange={onActivateModalSimulationOnlyChange}
                        disabled={workflowRunning || pipelineBoardOptions.length === 0}
                    />
                    <Text style={{ marginLeft: 8 }}>
                        SIMULATION ONLY (ROS2_CONTROL + RELOAD, NO FIRMWARE BUILD / FLASH)
                    </Text>
                    {activateModalSimulationOnly ? (
                        <Text
                            type="secondary"
                            style={{ display: 'block', marginTop: 6, marginLeft: 28, fontSize: 12 }}
                        >
                            Regenerates {generatedFileNames.ros2ControlXacro} and{' '}
                            {generatedFileNames.controllersYaml}, then reloads the
                            control stack — no firmware build or flash.
                        </Text>
                    ) : null}
                </div>

                {!activateModalSimulationOnly ? (
                <>
                <div>
                    <Text style={{ color: UI_TEXT_SUBTLE, fontSize: 12, marginBottom: 8, display: 'block' }}>
                        BOARDS
                        {pipelineBoardOptions.length > 0 ? (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {' '}
                                — none selected → ACTIVATE ONLY (no build / flash)
                            </Text>
                        ) : null}
                    </Text>
                    {pipelineBoardOptions.length === 0 ? (
                        <Text type="secondary">No boards in the loaded YAML — system mapping applies.</Text>
                    ) : (
                        <Checkbox.Group
                            className="hardware-config-ant-checkbox-group"
                            options={pipelineBoardOptions}
                            value={activateModalBoards}
                            onChange={(vals) => onActivateModalBoardsChange(vals.map(String))}
                            disabled={workflowRunning}
                        />
                    )}
                </div>
                <div>
                    <Switch
                        className="hardware-config-ant-switch"
                        checked={activateModalActivateOnly}
                        onChange={onActivateModalActivateOnlyChange}
                        disabled={workflowRunning}
                    />
                    <Text style={{ marginLeft: 8 }}>ACTIVATE ONLY (NO BUILD / FLASH / RELOAD)</Text>
                </div>
                <div>
                    <Switch
                        className="hardware-config-ant-switch"
                        checked={activateModalBuildOnly}
                        onChange={onActivateModalBuildOnlyChange}
                        disabled={workflowRunning}
                    />
                    <Text style={{ marginLeft: 8 }}>BUILD ONLY (NO FLASH)</Text>
                </div>
                <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                    ros2_control and controllers are regenerated before firmware build (same as simulation,
                    plus BUILD / FLASH when selected).
                </Text>
                </>
                ) : null}

                <Card size="small" style={{ ...UI_CARD_SURFACE_STYLE }}>
                    <HardwareConfigPresetHeaderTag
                        variant="target"
                        label="TARGET"
                        value={selectedTargetConfigName || ''}
                    />
                    <Divider type="vertical" />
                    <Text strong style={{ color: UI_TEXT_PRIMARY_ON_DARK }}>
                        ROBOT PACKAGE:{' '}
                    </Text>
                    <Text style={{ color: UI_ACCENT_GREEN }}>{serverRobotPackage || '—'}</Text>
                </Card>

                <Divider style={{ margin: '8px 0' }} />

                <div>
                    <Text strong style={{ color: UI_TEXT_PRIMARY_ON_DARK, display: 'block', marginBottom: 8 }}>
                        PROGRESS
                    </Text>
                    <Progress
                        percent={workflowOverallPercent}
                        status={workflowRunning ? 'active' : undefined}
                        strokeColor={UI_ACCENT_GREEN}
                    />
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: activateModalSimulationOnly
                                ? 'repeat(2, 1fr)'
                                : 'repeat(3, 1fr)',
                            gap: 8,
                            marginTop: 12,
                        }}
                    >
                        {(activateModalSimulationOnly
                            ? (['validate', 'activate', 'generate', 'reload'] as const)
                            : (['validate', 'activate', 'generate', 'build', 'flash', 'reload'] as const)
                        )
                            .map((id) => workflowSteps.find((s) => s.id === id))
                            .filter((s): s is NonNullable<typeof s> => s != null)
                            .map((s) => (
                            <Card
                                key={s.id}
                                size="small"
                                style={{
                                    ...UI_CARD_SURFACE_STYLE,
                                    borderColor: s.status === 'running' ? UI_ACCENT_GREEN : UI_BORDER_MUTED,
                                    opacity: s.status === 'pending' ? 0.75 : 1,
                                }}
                            >
                                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                                    <Space size={6}>
                                        {stepIcon(s.status)}
                                        <Text strong style={{ color: UI_TEXT_PRIMARY_ON_DARK, fontSize: 12 }}>
                                            {s.title}
                                        </Text>
                                    </Space>
                                    {s.status === 'running' ? (
                                        <Progress
                                            percent={Math.round(s.fraction * 100)}
                                            size="small"
                                            showInfo={false}
                                            strokeColor={UI_WARNING}
                                        />
                                    ) : null}
                                    {s.detail ? (
                                        <Text type="secondary" style={{ fontSize: 10, lineHeight: 1.3 }}>
                                            {s.detail}
                                        </Text>
                                    ) : null}
                                </Space>
                            </Card>
                        ))}
                    </div>
                    {workflowDetailLine ? (
                        <Text type="secondary" style={{ display: 'block', marginTop: 10, fontSize: 12 }}>
                            {workflowDetailLine}
                        </Text>
                    ) : null}
                </div>

                {showGazeboRestartPrompt ? (
                    <Alert
                        type="warning"
                        showIcon
                        icon={<WarningOutlined />}
                        message="SIMULATOR RESTART REQUIRED"
                        description={
                            <GazeboRestartDiffBody diff={workflowLastRunDiff} />
                        }
                    />
                ) : null}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                    {workflowRunning ? (
                        <Button danger onClick={onAbort}>
                            ABORT
                        </Button>
                    ) : (
                        <span />
                    )}
                    <Space>
                        {!workflowRunning && workflowLastRunSucceeded ? (
                            <>
                                <Button
                                    icon={<ThunderboltOutlined />}
                                    onClick={() => void onRun()}
                                    disabled={!canRun}
                                >
                                    RUN AGAIN
                                </Button>
                                <Button
                                    type="primary"
                                    onClick={onClose}
                                    style={UI_PRIMARY_GREEN_BUTTON_STYLE}
                                >
                                    DONE
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button onClick={onClose} disabled={workflowRunning}>
                                    CANCEL
                                </Button>
                                {!workflowRunning ? (
                                    <Button
                                        type="primary"
                                        icon={<ThunderboltOutlined />}
                                        onClick={() => void onRun()}
                                        disabled={!canRun}
                                        style={UI_PRIMARY_GREEN_BUTTON_STYLE}
                                    >
                                        RUN
                                    </Button>
                                ) : null}
                            </>
                        )}
                    </Space>
                </div>
            </Space>
        </Modal>
    );
}

function GazeboRestartDiffBody({ diff }: { diff: HardwareConfigDiff | null }) {
    const noun = (n: number, s: string) => `${n} ${s}${n === 1 ? '' : 's'}`;
    return (
        <Space direction="vertical" size={6} style={{ width: '100%' }}>
            <div style={{ fontSize: 12 }}>
                <Text strong>In Lucy TUI:</Text>
                <ol style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                    <li>Untick "with Simulator"</li>
                    <li>Press enter to stop the simulator</li>
                    <li>Tick back "with Simulator"</li>
                    <li>Press enter to restart the stack with the simulator</li>
                </ol>
            </div>
            {diff ? (
                <>
                    <Divider style={{ margin: '6px 0' }} />
                    <Space size={6} wrap>
                        {diff.boardsAdded.length > 0 ? (
                            <Tag color="green">+{noun(diff.boardsAdded.length, 'board')}</Tag>
                        ) : null}
                        {diff.boardsRemoved.length > 0 ? (
                            <Tag color="red">-{noun(diff.boardsRemoved.length, 'board')}</Tag>
                        ) : null}
                        {diff.actuatorsAdded.length > 0 ? (
                            <Tag color="green">+{noun(diff.actuatorsAdded.length, 'actuator')}</Tag>
                        ) : null}
                        {diff.actuatorsRemoved.length > 0 ? (
                            <Tag color="red">-{noun(diff.actuatorsRemoved.length, 'actuator')}</Tag>
                        ) : null}
                        {diff.actuatorsModified.length > 0 ? (
                            <Tag color="orange">
                                ~{noun(diff.actuatorsModified.length, 'actuator')} modified
                            </Tag>
                        ) : null}
                    </Space>
                    <div style={{ maxHeight: 180, overflow: 'auto', fontSize: 11, lineHeight: 1.4 }}>
                        {diff.boardsAdded.map((b) => (
                            <div key={`b+${b}`}>
                                <Text type="success">+ board {b}</Text>
                            </div>
                        ))}
                        {diff.boardsRemoved.map((b) => (
                            <div key={`b-${b}`}>
                                <Text type="danger">− board {b}</Text>
                            </div>
                        ))}
                        {diff.actuatorsAdded.map((a) => (
                            <div key={`a+${a.actuatorId}`}>
                                <Text type="success">+ actuator {a.label}</Text>
                            </div>
                        ))}
                        {diff.actuatorsRemoved.map((a) => (
                            <div key={`a-${a.actuatorId}`}>
                                <Text type="danger">− actuator {a.label}</Text>
                            </div>
                        ))}
                        {diff.actuatorsModified.map((a) => (
                            <div key={`a~${a.actuatorId}`}>
                                <Text type="warning">~ actuator {a.label}</Text>
                                <span style={{ color: '#999' }}>
                                    {' '}
                                    {a.changes
                                        .map((c) => `${c.field}: ${String(c.before ?? '∅')} → ${String(c.after ?? '∅')}`)
                                        .join(', ')}
                                </span>
                            </div>
                        ))}
                    </div>
                </>
            ) : null}
        </Space>
    );
}
