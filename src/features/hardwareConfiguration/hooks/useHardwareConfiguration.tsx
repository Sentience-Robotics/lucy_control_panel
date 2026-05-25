import { message } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useActiveHardwareRos } from '../../../contexts/ActiveHardwareRosContext.tsx';
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

    const setActivateModalSimulationOnly = useCallback((v: boolean) => {
        setActivateModalSimulationOnlyInner(v);
        if (v) {
            setActivateModalBuildOnlyInner(false);
            setActivateModalActivateOnlyInner(false);
            setActivateModalBoards([]);
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

    const pipelineBoardIds = useMemo(
        () => editor.boardRows.map((r) => r.boardId),
        [editor.boardRows],
    );

    const pipelineBoardOptions = useMemo(
        () => pipelineBoardIds.map((id) => ({ label: id, value: id })),
        [pipelineBoardIds],
    );

    const {
        workflowRunning,
        workflowSteps,
        workflowOverallPercent,
        workflowDetailLine,
        runActivateWorkflow,
        abortWorkflow,
        resetWorkflowPresentation,
    } = useActivateConfigureWorkflow({
        messageApi,
        isConnected,
        robotPackageName: serverRobotPackage,
        refetchActiveHardware,
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
        const simDefault = pipelineBoardIds.length === 0;
        setActivateModalSimulationOnlyInner(simDefault);
        setActivateModalBoards(simDefault ? [] : [...pipelineBoardIds]);
        setActivateModalBuildOnlyInner(false);
        setActivateModalActivateOnlyInner(false);
        resetWorkflowPresentation(simDefault, false, false);
        setActivateModalOpen(true);
    }, [pipelineBoardIds, resetWorkflowPresentation]);

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
        modalCanRun,
        pipelineBoardOptions,
        editorLocked,
        serverFlashedConfigName,
        serverFlashedAt,
        ...editor,
    };
}
