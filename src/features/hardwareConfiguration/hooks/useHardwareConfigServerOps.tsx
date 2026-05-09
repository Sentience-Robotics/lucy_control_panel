import { ExclamationCircleOutlined } from '@ant-design/icons';
import type { ModalStaticFunctions } from 'antd/es/modal/confirm';
import type { MessageInstance } from 'antd/es/message/interface';
import { useCallback, useState } from 'react';
import { UI_ERROR_RED, UI_WARNING_AMBER } from '../../../Constants/uiTheme.ts';
import type { ActiveHardwareFetchResult } from '../../../contexts/ActiveHardwareRosContext.tsx';
import { HardwareConfigHandler } from '../../../Services/ros/handlers/HardwareConfig.handler.ts';
import { mapStructuredValidationErrors } from '../../../Utils/hardwareConfigServerErrors.ts';
import { parseHardwareConfigYaml, stringifyHardwareConfigYaml } from '../../../Utils/hardwareConfigYaml.ts';

export interface HardwareConfigServerOpsParams {
    modal: Pick<ModalStaticFunctions, 'confirm'>;
    messageApi: MessageInstance;
    isConnected: boolean;
    isDirty: boolean;
    serverActiveConfigName: string;
    loadConfigName: string;
    setLoadConfigName: (v: string | ((p: string) => string)) => void;
    yamlDoc: Record<string, unknown> | null;
    setYamlDoc: (v: Record<string, unknown> | null) => void;
    loadedSnapshot: Record<string, unknown> | null;
    setLoadedSnapshot: (v: Record<string, unknown> | null) => void;
    resolvedName: string;
    setResolvedName: (v: string) => void;
    setLoading: (v: boolean) => void;
    setSaving: (v: boolean) => void;
    setIsDirty: (v: boolean) => void;
    setServerFieldErrors: (v: Map<string, string[]>) => void;
    setLastValidationLines: (v: string[]) => void;
    setUrdfWarnings: (v: string[]) => void;
    clearServerValidation: () => void;
    refreshSavedConfigs: () => Promise<string | undefined>;
    refetchActiveHardware: () => Promise<ActiveHardwareFetchResult>;
}

/**
 * Load / save / revert / activate / delete flows against the ROS hardware-config service.
 */
export function useHardwareConfigServerOps({
    modal,
    messageApi,
    isConnected,
    isDirty,
    serverActiveConfigName,
    loadConfigName,
    setLoadConfigName,
    yamlDoc,
    setYamlDoc,
    loadedSnapshot,
    setLoadedSnapshot,
    resolvedName,
    setResolvedName,
    setLoading,
    setSaving,
    setIsDirty,
    setServerFieldErrors,
    setLastValidationLines,
    setUrdfWarnings,
    clearServerValidation,
    refreshSavedConfigs,
    refetchActiveHardware,
}: HardwareConfigServerOpsParams) {
    const [activating, setActivating] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const loadHardwareConfig = useCallback(
        async (configName: string, opts?: { successToast?: boolean }): Promise<boolean> => {
            const showSuccessToast = opts?.successToast ?? true;
            if (!isConnected) {
                messageApi.error('Connect to ROS bridge from the main panel first.');
                return false;
            }
            setLoading(true);
            clearServerValidation();
            try {
                const trimmed = configName.trim();
                if (trimmed === '') {
                    const r = await refetchActiveHardware();
                    if (!r.ok) {
                        messageApi.error(r.message);
                        return false;
                    }
                    const doc = structuredClone(r.doc);
                    setYamlDoc(doc);
                    setLoadedSnapshot(structuredClone(doc));
                    setResolvedName(r.configName);
                    setLoadConfigName(r.configName);
                    setIsDirty(false);
                    if (showSuccessToast) {
                        messageApi.success(`Loaded config: ${r.configName || '(active)'}`);
                    }
                    return true;
                }
                const res = await HardwareConfigHandler.getConfig(trimmed);
                if (!res.success) {
                    messageApi.error(res.message || 'Load failed');
                    return false;
                }
                const doc = parseHardwareConfigYaml(res.config_yaml || '');
                setYamlDoc(doc);
                setLoadedSnapshot(structuredClone(doc));
                setResolvedName(res.config_name || '');
                setLoadConfigName(trimmed);
                setIsDirty(false);
                if (showSuccessToast) {
                    messageApi.success(`Loaded config: ${res.config_name || '(active)'}`);
                }
                return true;
            } catch (e) {
                console.error(e);
                messageApi.error(e instanceof Error ? e.message : 'Failed to load hardware YAML');
                return false;
            } finally {
                setLoading(false);
            }
        },
        [
            isConnected,
            messageApi,
            refetchActiveHardware,
            clearServerValidation,
            setYamlDoc,
            setLoadedSnapshot,
            setResolvedName,
            setLoadConfigName,
            setIsDirty,
            setLoading,
        ],
    );

    const runActivateConfig = useCallback(async () => {
        const name = loadConfigName.trim();
        if (!name) return;
        setActivating(true);
        try {
            const r = await HardwareConfigHandler.activateConfig(name);
            if (!r.success) {
                messageApi.error(r.message || 'Activate failed');
                return;
            }
            const backup = r.backup_name?.trim();
            messageApi.success(
                backup
                    ? `Activated "${name}". Previous active backed up as "${backup}".`
                    : `Activated "${name}".`,
            );
            await refreshSavedConfigs();
            await refetchActiveHardware();
        } catch (e) {
            messageApi.error(e instanceof Error ? e.message : 'Activate failed');
        } finally {
            setActivating(false);
        }
    }, [loadConfigName, messageApi, refreshSavedConfigs, refetchActiveHardware]);

    const handleActivateClick = useCallback(() => {
        const name = loadConfigName.trim();
        if (!name) return;
        const bits = [
            `Copies the saved configuration "${name}" to active.yaml on the robot.`,
            serverActiveConfigName && serverActiveConfigName !== name
                ? `Currently active configuration: ${serverActiveConfigName}.`
                : null,
            isDirty
                ? 'You have unsaved editor changes — SAVE writes them to this configuration file first. Activate uses whatever is already saved on the server.'
                : null,
        ].filter(Boolean);
        modal.confirm({
            title: `ACTIVATE CONFIGURATION "${name}"?`,
            icon: <ExclamationCircleOutlined style={{ color: UI_WARNING_AMBER }} />,
            content: <span>{bits.join(' ')}</span>,
            okText: 'ACTIVATE',
            cancelText: 'CANCEL',
            okType: 'danger',
            onOk: runActivateConfig,
        });
    }, [loadConfigName, serverActiveConfigName, isDirty, modal, runActivateConfig]);

    const runDeleteConfig = useCallback(async () => {
        const name = loadConfigName.trim();
        if (!name) return;
        setDeleting(true);
        try {
            const r = await HardwareConfigHandler.deleteConfig(name);
            if (!r.success) {
                messageApi.error(r.message || 'Delete failed');
                return;
            }
            messageApi.success(`Deleted configuration "${name}".`);
            const targetWasDeleted = loadConfigName.trim() === name;
            const activeAfterList = await refreshSavedConfigs();
            if (targetWasDeleted) {
                setLoadConfigName(activeAfterList ?? '');
            }
        } catch (e) {
            messageApi.error(e instanceof Error ? e.message : 'Delete failed');
        } finally {
            setDeleting(false);
        }
    }, [loadConfigName, messageApi, refreshSavedConfigs, setLoadConfigName]);

    const handleDeleteClick = useCallback(() => {
        const name = loadConfigName.trim();
        if (!name) return;
        modal.confirm({
            title: `DELETE "${name}"?`,
            icon: <ExclamationCircleOutlined style={{ color: UI_ERROR_RED }} />,
            content:
                'THIS REMOVES THE TARGETED CONFIG (IF IT IS NOT THE ACTIVE CONFIGURATION OR "DEFAULT")',
            okText: 'DELETE',
            cancelText: 'CANCEL',
            okButtonProps: { danger: true },
            onOk: runDeleteConfig,
        });
    }, [loadConfigName, modal, runDeleteConfig]);

    const handleRevert = useCallback(() => {
        if (!loadedSnapshot) {
            messageApi.warning('Nothing to revert — load a config first.');
            return;
        }
        setYamlDoc(structuredClone(loadedSnapshot));
        setIsDirty(false);
        clearServerValidation();
        setLoadConfigName(resolvedName.trim());
        messageApi.info('Reverted to last loaded snapshot.');
    }, [
        loadedSnapshot,
        resolvedName,
        messageApi,
        setYamlDoc,
        setIsDirty,
        clearServerValidation,
        setLoadConfigName,
    ]);

    const saveConfigByName = useCallback(
        async (name: string): Promise<boolean> => {
            if (!yamlDoc) return false;
            const n = name.trim();
            if (!n) {
                messageApi.error('Enter a config name to save under.');
                return false;
            }
            setSaving(true);
            clearServerValidation();
            try {
                const yamlText = stringifyHardwareConfigYaml(yamlDoc);
                const res = await HardwareConfigHandler.saveConfig(n, yamlText, false);
                setUrdfWarnings(res.urdf_warnings ?? []);
                if (!res.success) {
                    const lines = res.validation_errors ?? [];
                    setLastValidationLines(lines);
                    setServerFieldErrors(mapStructuredValidationErrors(lines));
                    messageApi.error(res.message || 'Save rejected');
                    return false;
                }
                messageApi.success(`Saved config "${n}" (activate=false)`);
                setLoadedSnapshot(structuredClone(yamlDoc));
                setResolvedName(n);
                setLoadConfigName(n);
                setIsDirty(false);
                setServerFieldErrors(new Map());
                setLastValidationLines([]);
                await refreshSavedConfigs();
                return true;
            } catch (e) {
                console.error(e);
                messageApi.error(e instanceof Error ? e.message : 'Save failed');
                return false;
            } finally {
                setSaving(false);
            }
        },
        [
            yamlDoc,
            messageApi,
            clearServerValidation,
            setSaving,
            setUrdfWarnings,
            setLastValidationLines,
            setServerFieldErrors,
            setLoadedSnapshot,
            setResolvedName,
            setLoadConfigName,
            setIsDirty,
            refreshSavedConfigs,
        ],
    );

    const refreshConfigListForModal = useCallback(async () => {
        await refreshSavedConfigs();
    }, [refreshSavedConfigs]);

    const selectedTargetConfigName = loadConfigName.trim();
    const canActivateConfig =
        isConnected &&
        Boolean(selectedTargetConfigName) &&
        selectedTargetConfigName !== serverActiveConfigName &&
        !activating;
    const canDeleteConfig =
        isConnected &&
        Boolean(selectedTargetConfigName) &&
        selectedTargetConfigName !== 'default' &&
        selectedTargetConfigName !== serverActiveConfigName &&
        !deleting;

    return {
        loadHardwareConfig,
        handleRevert,
        saveConfigByName,
        refreshConfigListForModal,
        handleActivateClick,
        handleDeleteClick,
        activating,
        deleting,
        selectedTargetConfigName,
        canActivateConfig,
        canDeleteConfig,
    };
}
