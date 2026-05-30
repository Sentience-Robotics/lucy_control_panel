import { message } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useActiveHardwareRos } from '../../../contexts/ActiveHardwareRosContext.tsx';
import { useGazeboRunning } from '../../../hooks/useGazeboRunning.hook.ts';
import { useRosConnection } from '../../../hooks/useRosConnection.hook.ts';
import { boardsToFlashGoal } from '../utils/boardsToFlashGoal.ts';
import { useActivateConfigureWorkflow } from './useActivateConfigureWorkflow.tsx';
import { useHardwareConfigEditor } from './useHardwareConfigEditor.tsx';
import { useHardwareConfigLists } from './useHardwareConfigLists.ts';

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
        workflowDetailLine,
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
        resetWorkflowPresentation(true, false, false);
        setActivateModalOpen(true);
    }, [resetWorkflowPresentation]);

    const closeActivateModal = useCallback(() => {
        if (workflowRunning) return;
        setActivateModalOpen(false);
    }, [workflowRunning]);

    const onActivateModalBoardsChange = useCallback(
        (ids: string[]) => {
            setActivateModalBoards(ids);
            if (ids.length === 0) {
                setActivateModalSimulationOnlyInner(true);
            } else {
                setActivateModalSimulationOnlyInner(false);
            }
        },
        [],
    );

    const runWorkflowFromModal = useCallback(async () => {
        const name = editor.loadConfigName.trim();
        if (!name) return;
        const simulationOnly = activateModalSimulationOnly || pipelineBoardIds.length === 0;
        const flashBoards = simulationOnly ? [] : boardsToFlashGoal(activateModalBoards, pipelineBoardIds);
        const noBoardsSelected = !simulationOnly && pipelineBoardIds.length > 0 && activateModalBoards.length === 0;
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
        pipelineBoardIds,
        runActivateWorkflow,
    ]);

    const modalCanRun =
        Boolean(editor.selectedTargetConfigName.trim()) &&
        Boolean(serverRobotPackage.trim()) &&
        (activateModalSimulationOnly ||
            pipelineBoardIds.length === 0 ||
            activateModalBoards.length > 0 ||
            activateModalActivateOnly);

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
        abortWorkflow,
        workflowRunning,
        workflowSteps,
        workflowOverallPercent,
        workflowDetailLine,
        workflowLastRunSucceeded,
        workflowLastRunDiff,
        gazeboRunning,
        modalCanRun,
        pipelineBoardOptions,
        editorLocked,
        serverFlashedConfigName,
        serverFlashedAt,
        ...editor,
    };
}
