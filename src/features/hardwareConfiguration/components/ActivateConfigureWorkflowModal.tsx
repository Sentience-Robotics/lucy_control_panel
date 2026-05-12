import {
    CheckCircleOutlined,
    CloseCircleOutlined,
    LoadingOutlined,
    MinusCircleOutlined,
    ThunderboltOutlined,
} from '@ant-design/icons';
import { Button, Card, Checkbox, Divider, Modal, Progress, Space, Switch, Typography } from 'antd';
import { HardwareConfigPresetHeaderTag } from '../../../Components/HardwareConfigPresetTag.tsx';
import {
    UI_ACCENT_GREEN,
    UI_BORDER_MUTED,
    UI_BORDER_SOFT,
    UI_CARD_SURFACE_STYLE,
    UI_ERROR_RED,
    UI_MODAL_MASK_BG,
    UI_PRIMARY_GREEN_BUTTON_STYLE,
    UI_TEXT_PRIMARY_ON_DARK,
    UI_TEXT_SECONDARY_MUTED,
    UI_TEXT_SUBTLE,
    UI_WARNING_AMBER,
} from '../../../Constants/uiTheme.ts';
import type { WorkflowStepRuntimeStatus, WorkflowStepSlice } from '../activateWorkflowStepTypes.ts';
import '../configuration.switch.css';

const { Text, Title } = Typography;

const modalStyles = {
    mask: { backgroundColor: UI_MODAL_MASK_BG },
};

function stepIcon(status: WorkflowStepRuntimeStatus) {
    if (status === 'done') return <CheckCircleOutlined style={{ color: UI_ACCENT_GREEN }} />;
    if (status === 'error') return <CloseCircleOutlined style={{ color: UI_ERROR_RED }} />;
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
    /** Primary action */
    onRun: () => void | Promise<void>;
    onAbort: () => void;
    workflowRunning: boolean;
    workflowSteps: WorkflowStepSlice[];
    workflowOverallPercent: number;
    workflowDetailLine: string;
    canRun: boolean;
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
        onRun,
        onAbort,
        workflowRunning,
        workflowSteps,
        workflowOverallPercent,
        workflowDetailLine,
        canRun,
    } = props;

    return (
        <Modal
            title={
                <Title level={4} style={{ color: UI_ACCENT_GREEN, margin: 0 }}>
                    <ThunderboltOutlined /> ACTIVATE &amp; CONFIGURE
                </Title>
            }
            open={open}
            onCancel={workflowRunning ? () => {} : onClose}
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
                    <Text style={{ marginLeft: 8 }}>ACTIVATE ONLY (NO BUILD / FLASH)</Text>
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
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: 8,
                            marginTop: 12,
                        }}
                    >
                        {workflowSteps.map((s) => (
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
                                            strokeColor={UI_WARNING_AMBER}
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

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                    {workflowRunning ? (
                        <Button danger onClick={onAbort}>
                            ABORT
                        </Button>
                    ) : (
                        <span />
                    )}
                    <Space>
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
                    </Space>
                </div>
            </Space>
        </Modal>
    );
}
