import type { MessageInstance } from 'antd/es/message/interface';
import { useCallback, useRef, useState } from 'react';
import type { ConfigurePipelineFeedbackNormalized } from '../../../Constants/hardwareConfigTypes.ts';
import { HardwareConfigHandler } from '../../../Services/ros/handlers/HardwareConfig.handler.ts';
import { startConfigurePipeline } from '../../../Services/ros/handlers/ConfigurePipeline.handler.ts';
import type {
    WorkflowStepId,
    WorkflowStepSlice,
} from '../activateWorkflowStepTypes.ts';

function initialSteps(
    simulationOnly: boolean,
    buildOnly: boolean,
    activateOnly: boolean,
): WorkflowStepSlice[] {
    if (simulationOnly) {
        return [
            { id: 'validate', title: 'VALIDATE', status: 'pending', fraction: 0, detail: '' },
            { id: 'activate', title: 'ACTIVATE', status: 'pending', fraction: 0, detail: '' },
            { id: 'reload', title: 'RELOAD', status: 'pending', fraction: 0, detail: '' },
            {
                id: 'build',
                title: 'BUILD',
                status: 'skipped',
                fraction: 0,
                detail: 'Skipped (simulation only)',
            },
            {
                id: 'flash',
                title: 'FLASH',
                status: 'skipped',
                fraction: 0,
                detail: 'Skipped (simulation only)',
            },
        ];
    }
    return [
        { id: 'validate', title: 'VALIDATE', status: 'pending', fraction: 0, detail: '' },
        { id: 'activate', title: 'ACTIVATE', status: 'pending', fraction: 0, detail: '' },
        {
            id: 'build',
            title: 'BUILD',
            status: activateOnly ? 'skipped' : 'pending',
            fraction: 0,
            detail: activateOnly ? 'Skipped (activate only)' : '',
        },
        {
            id: 'flash',
            title: 'FLASH',
            status: buildOnly || activateOnly ? 'skipped' : 'pending',
            fraction: 0,
            detail: buildOnly
                ? 'Skipped (build only)'
                : activateOnly
                  ? 'Skipped (activate only)'
                  : '',
        },
        { id: 'reload', title: 'RELOAD', status: 'pending', fraction: 0, detail: '' },
    ];
}

export function computeWorkflowOverallPercent(steps: WorkflowStepSlice[]): number {
    const applicable = steps.filter((s) => s.status !== 'skipped');
    if (applicable.length === 0) return 0;
    const w = 1 / applicable.length;
    let sum = 0;
    for (const s of applicable) {
        if (s.status === 'done') sum += w;
        else if (s.status === 'running') {
            sum += w * Math.max(0, Math.min(1, s.fraction));
            break;
        } else break;
    }
    return Math.round(sum * 100);
}

function fractionForBuildAggregate(f: ConfigurePipelineFeedbackNormalized): number {
    const p = f.phase?.toLowerCase() ?? '';
    if (p === 'validate') return Math.max(0, Math.min(1, f.progress * 0.2));
    if (p === 'generate') return Math.max(0, Math.min(1, 0.2 + f.progress * 0.35));
    if (p === 'build') return Math.max(0, Math.min(1, 0.55 + f.progress * 0.45));
    return Math.max(0, Math.min(1, f.progress));
}

function fractionForValidateDryRun(f: ConfigurePipelineFeedbackNormalized): number {
    const p = f.phase?.toLowerCase() ?? '';
    if (p === 'validate') return Math.max(0, Math.min(1, f.progress * 0.55));
    if (p === 'generate') return Math.max(0, Math.min(1, 0.45 + f.progress * 0.55));
    return Math.max(0, Math.min(1, f.progress));
}

function fractionForWetSim(f: ConfigurePipelineFeedbackNormalized): number {
    const p = f.phase?.toLowerCase() ?? '';
    if (p === 'validate') return Math.max(0, Math.min(1, f.progress * 0.25));
    if (p === 'generate') return Math.max(0, Math.min(1, 0.25 + f.progress * 0.35));
    if (p === 'reload') return Math.max(0, Math.min(1, 0.6 + f.progress * 0.4));
    return Math.max(0, Math.min(1, f.progress));
}

export interface UseActivateConfigureWorkflowParams {
    messageApi: MessageInstance;
    isConnected: boolean;
    robotPackageName: string;
    refetchActiveHardware: () => Promise<unknown>;
}

export function useActivateConfigureWorkflow({
    messageApi,
    isConnected,
    robotPackageName,
    refetchActiveHardware,
}: UseActivateConfigureWorkflowParams) {
    const [workflowRunning, setWorkflowRunning] = useState(false);
    const [steps, setSteps] = useState<WorkflowStepSlice[]>(() => initialSteps(false, false, false));
    const [detailLine, setDetailLine] = useState('');
    const abortRef = useRef<(() => void) | null>(null);
    const runIdRef = useRef(0);

    const workflowOverallPercent = computeWorkflowOverallPercent(steps);

    const abortWorkflow = useCallback(() => {
        abortRef.current?.();
        abortRef.current = null;
    }, []);

    const resetWorkflowPresentation = useCallback(
        (simulationOnly: boolean, buildOnly: boolean, activateOnly: boolean) => {
            setSteps(initialSteps(simulationOnly, buildOnly, activateOnly));
            setDetailLine('');
        },
        [],
    );

    const patchStep = useCallback((id: WorkflowStepId, patch: Partial<Omit<WorkflowStepSlice, 'id' | 'title'>>) => {
        setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    }, []);

    const runActivateWorkflow = useCallback(
        async (params: {
            targetConfigName: string;
            boardsToFlash: string[];
            buildOnly: boolean;
            activateOnly: boolean;
            simulationOnly: boolean;
            refreshSavedConfigs: () => Promise<unknown>;
        }) => {
            const {
                targetConfigName,
                boardsToFlash,
                buildOnly,
                activateOnly,
                simulationOnly,
            } = params;
            const rp = robotPackageName.trim();
            if (!isConnected) {
                messageApi.error('Connect to ROS bridge first.');
                return;
            }
            if (!targetConfigName.trim()) {
                messageApi.warning('Pick a TARGET configuration.');
                return;
            }
            if (!rp) {
                messageApi.error('Robot package is not known yet — wait for config/get.');
                return;
            }

            const runId = ++runIdRef.current;
            abortRef.current = null;
            setWorkflowRunning(true);
            setSteps(initialSteps(simulationOnly, buildOnly, activateOnly));
            setDetailLine('');

            const shouldContinue = () => runId === runIdRef.current;

            const failStep = (id: WorkflowStepId, msg: string) => {
                if (!shouldContinue()) return;
                patchStep(id, { status: 'error', fraction: 1, detail: msg });
                setDetailLine(msg);
                messageApi.error(msg);
            };

            try {
                patchStep('validate', { status: 'running', fraction: 0, detail: 'Dry run…' });
                setDetailLine('VALIDATE — dry run against TARGET mapping…');

                const dry = startConfigurePipeline(
                    {
                        robot_package: rp,
                        mapping_file: targetConfigName.trim(),
                        boards_to_flash: boardsToFlash,
                        dry_run: true,
                        build_only: false,
                        simulation_only: simulationOnly,
                    },
                    {
                        onFeedback: (f) => {
                            if (!shouldContinue()) return;
                            setDetailLine(f.detail || `VALIDATE — ${f.phase}`);
                            patchStep('validate', {
                                status: 'running',
                                fraction: fractionForValidateDryRun(f),
                                detail: f.detail || f.phase,
                            });
                        },
                    },
                );
                abortRef.current = dry.abort;

                const dryRes = await dry.promise;
                abortRef.current = null;
                if (!shouldContinue()) return;

                if (!dryRes.success) {
                    failStep('validate', dryRes.message || 'Validation failed');
                    return;
                }
                patchStep('validate', { status: 'done', fraction: 1, detail: 'OK' });

                patchStep('activate', { status: 'running', fraction: 0.5, detail: '/config/activate…' });
                setDetailLine('ACTIVATE — promoting preset to active…');

                const act = await HardwareConfigHandler.activateConfig(targetConfigName.trim(), rp);
                if (!shouldContinue()) return;
                if (!act.success) {
                    failStep('activate', act.message || 'Activate failed');
                    return;
                }
                const backup = act.backup_name?.trim();
                patchStep('activate', {
                    status: 'done',
                    fraction: 1,
                    detail: backup ? `Backup: ${backup}` : 'OK',
                });
                await params.refreshSavedConfigs();
                await refetchActiveHardware();

                if (activateOnly && !simulationOnly) {
                    patchStep('build', {
                        status: 'skipped',
                        fraction: 0,
                        detail: 'Skipped (activate only)',
                    });
                    patchStep('flash', {
                        status: 'skipped',
                        fraction: 0,
                        detail: 'Skipped (activate only)',
                    });
                    patchStep('reload', {
                        status: 'skipped',
                        fraction: 0,
                        detail: 'Skipped (activate only)',
                    });
                    setDetailLine('Activated — build, flash, and reload skipped.');
                    await refetchActiveHardware();
                    messageApi.success('Configuration activated (build, flash, and reload skipped).');
                    return;
                }

                if (!simulationOnly) {
                    patchStep('build', { status: 'running', fraction: 0, detail: '' });
                    if (!buildOnly) {
                        patchStep('flash', { status: 'pending', fraction: 0, detail: '' });
                    }
                }
                patchStep('reload', { status: 'pending', fraction: 0, detail: '' });
                setDetailLine(
                    simulationOnly
                        ? 'SIMULATION — generate sim ros2_control and reload…'
                        : 'BUILD — pipeline on active mapping…',
                );

                let sawFlash = false;
                let sawReload = false;
                const wet = startConfigurePipeline(
                    {
                        robot_package: rp,
                        mapping_file: '',
                        boards_to_flash: boardsToFlash,
                        dry_run: false,
                        build_only: buildOnly,
                        simulation_only: simulationOnly,
                    },
                    {
                        onFeedback: (f: ConfigurePipelineFeedbackNormalized) => {
                            if (!shouldContinue()) return;
                            const phase = (f.phase || '').toLowerCase();
                            setDetailLine(f.detail || `${phase.toUpperCase()}…`);

                            if (phase === 'reload') {
                                sawReload = true;
                                if (!simulationOnly) {
                                    patchStep('build', { status: 'done', fraction: 1, detail: 'OK' });
                                    if (buildOnly) {
                                        patchStep('flash', {
                                            status: 'skipped',
                                            fraction: 0,
                                            detail: 'Skipped (build only)',
                                        });
                                    } else {
                                        patchStep('flash', { status: 'done', fraction: 1, detail: 'OK' });
                                    }
                                }
                                patchStep('reload', {
                                    status: 'running',
                                    fraction: Math.max(0, Math.min(1, f.progress)),
                                    detail: f.detail || phase,
                                });
                            } else if (phase === 'flash') {
                                sawFlash = true;
                                patchStep('build', { status: 'done', fraction: 1, detail: 'OK' });
                                patchStep('flash', {
                                    status: 'running',
                                    fraction: Math.max(0, Math.min(1, f.progress)),
                                    detail: f.detail || phase,
                                });
                            } else if (simulationOnly) {
                                patchStep('reload', {
                                    status: 'running',
                                    fraction: fractionForWetSim(f),
                                    detail: f.detail || phase,
                                });
                            } else {
                                patchStep('build', {
                                    status: 'running',
                                    fraction: fractionForBuildAggregate(f),
                                    detail: f.detail || phase,
                                });
                            }
                        },
                    },
                );
                abortRef.current = wet.abort;

                const wetRes = await wet.promise;
                abortRef.current = null;
                if (!shouldContinue()) return;

                if (!wetRes.success) {
                    const msg = wetRes.message || 'Configure pipeline failed';
                    if (simulationOnly && sawReload) failStep('reload', msg);
                    else if (buildOnly || !sawFlash) failStep('build', msg);
                    else failStep('flash', msg);
                    return;
                }

                if (!simulationOnly) {
                    patchStep('build', { status: 'done', fraction: 1, detail: 'OK' });
                    if (buildOnly) {
                        patchStep('flash', {
                            status: 'skipped',
                            fraction: 0,
                            detail: 'Skipped (build only)',
                        });
                    } else {
                        patchStep('flash', { status: 'done', fraction: 1, detail: 'OK' });
                    }
                }
                patchStep('reload', { status: 'done', fraction: 1, detail: 'OK' });
                setDetailLine(wetRes.message || 'Complete');
                await refetchActiveHardware();
                messageApi.success(`Workflow finished: ${wetRes.message || 'OK'}`);
            } catch (e) {
                if (!shouldContinue()) return;
                const msg = e instanceof Error ? e.message : 'Workflow failed';
                setDetailLine(msg);
                messageApi.error(msg);
                setSteps((prev) =>
                    prev.map((s) =>
                        s.status === 'running' ? { ...s, status: 'error', detail: msg, fraction: s.fraction } : s,
                    ),
                );
            } finally {
                abortRef.current = null;
                if (runId === runIdRef.current) setWorkflowRunning(false);
            }
        },
        [isConnected, messageApi, patchStep, refetchActiveHardware, robotPackageName],
    );

    return {
        workflowRunning,
        workflowSteps: steps,
        workflowOverallPercent,
        workflowDetailLine: detailLine,
        runActivateWorkflow,
        abortWorkflow,
        resetWorkflowPresentation,
    };
}
