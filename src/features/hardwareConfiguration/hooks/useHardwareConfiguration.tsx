/*
 * Copyright 2025-2026 Sentience Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { message } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useActiveHardwareRos } from '../../../contexts/ActiveHardwareRosContext.tsx';
import { useGazeboRunning } from '../../../hooks/useGazeboRunning.hook.ts';
import { useRosConnection } from '../../../hooks/useRosConnection.hook.ts';
import { HardwareConfigHandler } from '../../../Services/ros/handlers/HardwareConfig.handler.ts';
import { parseHardwareConfigYaml } from '../../../Utils/hardwareConfigYaml.ts';
import { resolveGeneratedFiles } from '../../../Utils/generatedFiles.ts';
import { computeHardwareConfigDiff } from '../model/hardwareConfigDiff.ts';
import { boardsToFlashGoal } from '../utils/boardsToFlashGoal.ts';
import { useActivateConfigureWorkflow } from './useActivateConfigureWorkflow.tsx';
import { useHardwareConfigEditor } from './useHardwareConfigEditor.tsx';
import { useHardwareConfigLists } from './useHardwareConfigLists.ts';

export type NewlyEnabledActuator = { actuatorId: string; label: string };

export function useHardwareConfiguration() {
    const { isConnected } = useRosConnection();
    const {
        activeHardwareDoc,
        activeHardwareConfigName,
        activeHardwareFetchEpoch,
        refetchActiveHardware,
        serverRobotPackage,
        recordServerRobotPackage,
        serverFlashedConfigName,
        serverFlashedAt,
        recordServerFlashedMeta,
    } = useActiveHardwareRos();
    const [messageApi, contextHolderMessage] = message.useMessage();

    const [activateModalOpen, setActivateModalOpen] = useState(false);
    const [activateModalBoards, setActivateModalBoards] = useState<string[]>([]);
    const [activateModalBuildOnly, setActivateModalBuildOnlyInner] = useState(false);
    const [activateModalActivateOnly, setActivateModalActivateOnlyInner] = useState(false);
    const [activateModalSimulationOnly, setActivateModalSimulationOnlyInner] = useState(false);
    /** In-modal confirm when RUN would newly enable real actuators (avoids Ant Modal under overlay). */
    const [pendingEnableConfirm, setPendingEnableConfirm] = useState<NewlyEnabledActuator[] | null>(
        null,
    );
    const [runPreparing, setRunPreparing] = useState(false);

    const setActivateModalBuildOnly = useCallback((v: boolean) => {
        setActivateModalBuildOnlyInner(v);
        if (v) {
            setActivateModalActivateOnlyInner(false);
            setActivateModalSimulationOnlyInner(false);
        }
    }, []);

    const setActivateModalActivateOnly = useCallback((v: boolean) => {
        setActivateModalActivateOnlyInner(v);
        if (v) {
            setActivateModalBuildOnlyInner(false);
            setActivateModalSimulationOnlyInner(false);
        }
    }, []);

    const lists = useHardwareConfigLists(isConnected, messageApi);
    const editor = useHardwareConfigEditor({
        messageApi,
        recordServerRobotPackage,
        recordServerFlashedMeta,
        refreshSavedConfigs: lists.refreshSavedConfigs,
        serverActiveConfigName: lists.serverActiveConfigName,
        activeHardwareDoc,
        activeHardwareConfigName,
        activeHardwareFetchEpoch,
        refetchActiveHardware,
    });

    const gazeboRunning = useGazeboRunning();
    // Always carry the latest active doc in a ref so the workflow can snapshot
    // it without re-rendering or stale closures.
    const activeHardwareDocRef = useRef<Record<string, unknown> | null>(null);
    useEffect(() => {
        activeHardwareDocRef.current = activeHardwareDoc;
    }, [activeHardwareDoc]);
    const getPreRunActiveSnapshot = useCallback(() => {
        const doc = activeHardwareDocRef.current;
        return doc ? (structuredClone(doc) as Record<string, unknown>) : null;
    }, []);

    const pipelineBoardIds = useMemo(
        () => editor.boardRows.map((r) => r.boardId),
        [editor.boardRows],
    );

    const pipelineBoardOptions = useMemo(
        () => pipelineBoardIds.map((id) => ({ label: id, value: id })),
        [pipelineBoardIds],
    );

    const setActivateModalSimulationOnly = useCallback(
        (v: boolean) => {
            setActivateModalSimulationOnlyInner(v);
            if (v) {
                setActivateModalBuildOnlyInner(false);
                setActivateModalActivateOnlyInner(false);
                setActivateModalBoards([]);
            } else {
                // Leaving SIMULATION ONLY pre-selects all known boards so the
                // hardware workflow is immediately runnable.
                setActivateModalBoards((prev) =>
                    prev.length === 0 && pipelineBoardIds.length > 0 ? [...pipelineBoardIds] : prev,
                );
            }
        },
        [pipelineBoardIds],
    );

    const {
        workflowRunning,
        workflowSteps,
        workflowOverallPercent,
        workflowLastRunSucceeded,
        workflowLastRunDiff,
        runActivateWorkflow,
        abortWorkflow,
        resetWorkflowPresentation,
    } = useActivateConfigureWorkflow({
        messageApi,
        isConnected,
        robotPackageName: serverRobotPackage,
        refetchActiveHardware,
        getPreRunActiveSnapshot,
    });

    useEffect(() => {
        if (!activateModalOpen) return;
        resetWorkflowPresentation(
            activateModalSimulationOnly,
            activateModalBuildOnly,
            activateModalActivateOnly,
        );
    }, [
        activateModalOpen,
        activateModalSimulationOnly,
        activateModalBuildOnly,
        activateModalActivateOnly,
        resetWorkflowPresentation,
    ]);

    useEffect(() => {
        if (!activateModalOpen || workflowRunning) return;
        if (pipelineBoardIds.length === 0) {
            setActivateModalSimulationOnlyInner(true);
            return;
        }
        if (activateModalBoards.length === 0 && !activateModalSimulationOnly) {
            setActivateModalActivateOnlyInner(true);
        }
    }, [
        activateModalOpen,
        workflowRunning,
        pipelineBoardIds.length,
        activateModalBoards.length,
        activateModalSimulationOnly,
        setActivateModalActivateOnly,
    ]);

    const openActivateModal = useCallback(() => {
        // Default to SIMULATION ONLY so the modal opens with the safe sim flow;
        // users with real boards can disable the switch (which pre-selects all boards).
        setActivateModalSimulationOnlyInner(true);
        setActivateModalBoards([]);
        setActivateModalBuildOnlyInner(false);
        setActivateModalActivateOnlyInner(false);
        setPendingEnableConfirm(null);
        setRunPreparing(false);
        resetWorkflowPresentation(true, false, false);
        setActivateModalOpen(true);
    }, [resetWorkflowPresentation]);

    const closeActivateModal = useCallback(() => {
        if (workflowRunning || runPreparing) return;
        setPendingEnableConfirm(null);
        setActivateModalOpen(false);
    }, [workflowRunning, runPreparing]);

    const onActivateModalBoardsChange = useCallback(
        (ids: string[]) => {
            setActivateModalBoards(ids);
            if (ids.length === 0) {
                setActivateModalSimulationOnlyInner(true);
            } else {
                setActivateModalSimulationOnlyInner(false);
                // Selecting boards implies a hardware flash path, not activate-only.
                setActivateModalActivateOnlyInner(false);
            }
        },
        [],
    );

    /**
     * Returns the list of actuators that will transition disabled→enabled (or
     * arrive newly already-enabled) when `targetConfigName` is activated, by
     * diffing it against the currently-active doc the supervisor reported.
     * Returns `null` when the diff cannot be computed (no active snapshot,
     * fetch failure, or unparseable YAML) so the caller can choose to
     * proceed without prompting.
     */
    const detectNewlyEnabledActuators = useCallback(
        async (targetConfigName: string): Promise<NewlyEnabledActuator[] | null> => {
            const active = activeHardwareDocRef.current;
            if (!active) return null;
            try {
                const res = await HardwareConfigHandler.getConfig(targetConfigName);
                if (!res.success) return null;
                const target = parseHardwareConfigYaml(res.config_yaml || '');
                const diff = computeHardwareConfigDiff(active, target);
                return diff.actuatorsNewlyEnabled;
            } catch {
                return null;
            }
        },
        [],
    );

    const startWorkflowWithCurrentModalOptions = useCallback(async () => {
        const name = editor.loadConfigName.trim();
        if (!name) {
            messageApi.warning('Pick a TARGET configuration.');
            return;
        }
        const simulationOnly = activateModalSimulationOnly || pipelineBoardIds.length === 0;
        const flashBoards = simulationOnly ? [] : boardsToFlashGoal(activateModalBoards, pipelineBoardIds);
        const noBoardsSelected =
            !simulationOnly && pipelineBoardIds.length > 0 && activateModalBoards.length === 0;

        setPendingEnableConfirm(null);
        await runActivateWorkflow({
            targetConfigName: name,
            boardsToFlash: flashBoards,
            buildOnly: activateModalBuildOnly,
            activateOnly: activateModalActivateOnly || noBoardsSelected,
            simulationOnly,
            refreshSavedConfigs: editor.refreshConfigListForModal,
        });
    }, [
        activateModalBoards,
        activateModalActivateOnly,
        activateModalBuildOnly,
        activateModalSimulationOnly,
        editor.loadConfigName,
        editor.refreshConfigListForModal,
        messageApi,
        pipelineBoardIds,
        runActivateWorkflow,
    ]);

    const runWorkflowFromModal = useCallback(async () => {
        const name = editor.loadConfigName.trim();
        if (!name) {
            messageApi.warning('Pick a TARGET configuration.');
            return;
        }
        const simulationOnly = activateModalSimulationOnly || pipelineBoardIds.length === 0;

        // Hardware-mode safety: confirm inside this modal (not Ant Modal.confirm,
        // which stacks under the activate overlay and looks like a no-op).
        if (!simulationOnly) {
            setRunPreparing(true);
            try {
                const newlyEnabled = await detectNewlyEnabledActuators(name);
                if (newlyEnabled && newlyEnabled.length > 0) {
                    setPendingEnableConfirm(newlyEnabled);
                    return;
                }
            } finally {
                setRunPreparing(false);
            }
        }

        await startWorkflowWithCurrentModalOptions();
    }, [
        activateModalSimulationOnly,
        detectNewlyEnabledActuators,
        editor.loadConfigName,
        messageApi,
        pipelineBoardIds.length,
        startWorkflowWithCurrentModalOptions,
    ]);

    const confirmPendingEnableAndRun = useCallback(async () => {
        await startWorkflowWithCurrentModalOptions();
    }, [startWorkflowWithCurrentModalOptions]);

    const cancelPendingEnableConfirm = useCallback(() => {
        setPendingEnableConfirm(null);
        messageApi.info('Activation cancelled.');
    }, [messageApi]);

    // Names the pipeline will write for this preset (active doc is the source of
    // truth); used only to keep the activate-workflow copy accurate.
    const generatedFileNames = useMemo(
        () => resolveGeneratedFiles(activeHardwareDoc),
        [activeHardwareDoc],
    );

    const modalCanRun =
        Boolean(editor.selectedTargetConfigName.trim()) &&
        Boolean(serverRobotPackage.trim()) &&
        (activateModalSimulationOnly ||
            pipelineBoardIds.length === 0 ||
            activateModalBoards.length > 0 ||
            activateModalActivateOnly);

    const modalRunBlockedReason = !isConnected
        ? 'Connect to ROS bridge first.'
        : !editor.selectedTargetConfigName.trim()
          ? 'Pick a TARGET configuration (LOAD a preset first).'
          : !serverRobotPackage.trim()
            ? 'Robot package unknown — core must be launched with robot_package:=… (header shows ROBOT PACKAGE).'
            : !(
                  activateModalSimulationOnly ||
                  pipelineBoardIds.length === 0 ||
                  activateModalBoards.length > 0 ||
                  activateModalActivateOnly
              )
              ? 'Select at least one board, or enable SIMULATION ONLY / ACTIVATE ONLY.'
              : '';

    const editorLocked = workflowRunning;

    return {
        contextHolderMessage,
        savedConfigNames: lists.savedConfigNames,
        serverActiveConfigName: lists.serverActiveConfigName,
        configListLoading: lists.configListLoading,
        serverRobotPackage,
        activateModalOpen,
        activateModalBoards,
        setActivateModalBoards: onActivateModalBoardsChange,
        activateModalBuildOnly,
        setActivateModalBuildOnly,
        activateModalActivateOnly,
        setActivateModalActivateOnly,
        activateModalSimulationOnly,
        setActivateModalSimulationOnly,
        openActivateModal,
        closeActivateModal,
        runWorkflowFromModal,
        confirmPendingEnableAndRun,
        cancelPendingEnableConfirm,
        pendingEnableConfirm,
        runPreparing,
        abortWorkflow,
        workflowRunning,
        workflowSteps,
        workflowOverallPercent,
        workflowLastRunSucceeded,
        workflowLastRunDiff,
        gazeboRunning,
        modalCanRun,
        modalRunBlockedReason,
        generatedFileNames,
        pipelineBoardOptions,
        editorLocked,
        serverFlashedConfigName,
        serverFlashedAt,
        ...editor,
    };
}
