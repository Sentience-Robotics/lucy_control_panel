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

    const setActivateModalBuildOnly = useCallback((v: boolean) => {
        setActivateModalBuildOnlyInner(v);
        if (v) setActivateModalActivateOnlyInner(false);
    }, []);

    const setActivateModalActivateOnly = useCallback((v: boolean) => {
        setActivateModalActivateOnlyInner(v);
        if (v) setActivateModalBuildOnlyInner(false);
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
        resetWorkflowPresentation(activateModalBuildOnly, activateModalActivateOnly);
    }, [
        activateModalOpen,
        activateModalBuildOnly,
        activateModalActivateOnly,
        resetWorkflowPresentation,
    ]);

    /** Empty board checkbox selection must not mean “flash everything” — force ACTIVATE ONLY. */
    useEffect(() => {
        if (!activateModalOpen || workflowRunning) return;
        if (pipelineBoardIds.length === 0 || activateModalBoards.length > 0) return;
        setActivateModalActivateOnly(true);
    }, [
        activateModalOpen,
        workflowRunning,
        pipelineBoardIds.length,
        activateModalBoards.length,
        setActivateModalActivateOnly,
    ]);

    const openActivateModal = useCallback(() => {
        setActivateModalBoards([...pipelineBoardIds]);
        setActivateModalBuildOnlyInner(false);
        setActivateModalActivateOnlyInner(false);
        resetWorkflowPresentation(false, false);
        setActivateModalOpen(true);
    }, [pipelineBoardIds, resetWorkflowPresentation]);

    const closeActivateModal = useCallback(() => {
        if (workflowRunning) return;
        setActivateModalOpen(false);
    }, [workflowRunning]);

    const runWorkflowFromModal = useCallback(async () => {
        const name = editor.loadConfigName.trim();
        if (!name) return;
        const flashBoards = boardsToFlashGoal(activateModalBoards, pipelineBoardIds);
        const noBoardsSelected = pipelineBoardIds.length > 0 && activateModalBoards.length === 0;
        await runActivateWorkflow({
            targetConfigName: name,
            boardsToFlash: flashBoards,
            buildOnly: activateModalBuildOnly,
            activateOnly: activateModalActivateOnly || noBoardsSelected,
            refreshSavedConfigs: editor.refreshConfigListForModal,
        });
    }, [
        activateModalBoards,
        activateModalActivateOnly,
        activateModalBuildOnly,
        editor.loadConfigName,
        editor.refreshConfigListForModal,
        pipelineBoardIds,
        runActivateWorkflow,
    ]);

    const modalCanRun =
        Boolean(editor.selectedTargetConfigName.trim()) &&
        Boolean(serverRobotPackage.trim()) &&
        (pipelineBoardIds.length === 0 ||
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
        setActivateModalBoards,
        activateModalBuildOnly,
        setActivateModalBuildOnly,
        activateModalActivateOnly,
        setActivateModalActivateOnly,
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
