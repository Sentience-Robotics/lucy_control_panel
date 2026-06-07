import { useRosConnection } from '../../../hooks/useRosConnection.hook.ts';
import type { HardwareConfigEditorParams } from './hardwareConfigEditorParams.ts';
import { useHardwareConfigEditorColumns } from './useHardwareConfigEditorColumns.tsx';
import { useHardwareConfigMutations } from './useHardwareConfigMutations.ts';
import { useHardwareConfigServerOps } from './useHardwareConfigServerOps.tsx';
import { useHardwareConfigTableModel } from './useHardwareConfigTableModel.ts';
import { useHardwareYamlEditorState } from './useHardwareYamlEditorState.ts';

export type { HardwareConfigEditorParams } from './hardwareConfigEditorParams.ts';

/**
 * Composes YAML snapshot state, derived tables, local mutations, ROS hardware-config ops, and Ant Design columns for the hardware configuration page.
 */
export function useHardwareConfigEditor(params: HardwareConfigEditorParams) {
    const { isConnected } = useRosConnection();

    const yaml = useHardwareYamlEditorState({
        isConnected,
        activeHardwareDoc: params.activeHardwareDoc,
        activeHardwareConfigName: params.activeHardwareConfigName,
        activeHardwareFetchEpoch: params.activeHardwareFetchEpoch,
    });

    const table = useHardwareConfigTableModel(yaml.yamlDoc);

    const mutations = useHardwareConfigMutations({
        yamlDoc: yaml.yamlDoc,
        patchDoc: yaml.patchDoc,
        messageApi: params.messageApi,
        boardsEligibleForNewActuator: table.boardsEligibleForNewActuator,
        addPressureSensorActuatorId: table.addPressureSensorActuatorId,
    });

    const server = useHardwareConfigServerOps({
        messageApi: params.messageApi,
        isConnected,
        loadConfigName: yaml.loadConfigName,
        setLoadConfigName: yaml.setLoadConfigName,
        yamlDoc: yaml.yamlDoc,
        setYamlDoc: yaml.setYamlDoc,
        loadedSnapshot: yaml.loadedSnapshot,
        setLoadedSnapshot: yaml.setLoadedSnapshot,
        resolvedName: yaml.resolvedName,
        setResolvedName: yaml.setResolvedName,
        setLoading: yaml.setLoading,
        setSaving: yaml.setSaving,
        setIsDirty: yaml.setIsDirty,
        setServerFieldErrors: yaml.setServerFieldErrors,
        setLastValidationLines: yaml.setLastValidationLines,
        setUrdfWarnings: yaml.setUrdfWarnings,
        clearServerValidation: yaml.clearServerValidation,
        refreshSavedConfigs: params.refreshSavedConfigs,
        refetchActiveHardware: params.refetchActiveHardware,
        recordServerRobotPackage: params.recordServerRobotPackage,
        recordServerFlashedMeta: params.recordServerFlashedMeta,
    });

    const { serverErrorRows, boardColumns, actuatorColumns, pressureSensorColumns } = useHardwareConfigEditorColumns({
        yamlDoc: yaml.yamlDoc,
        serverFieldErrors: yaml.serverFieldErrors,
        assignableUrdfJoints: table.assignableUrdfJoints,
        patchDoc: yaml.patchDoc,
        actuatorIdOnFocusRef: yaml.actuatorIdOnFocusRef,
        deleteActuatorAt: mutations.deleteActuatorAt,
        deletePressureSensorAt: mutations.deletePressureSensorAt,
    });

    return {
        isConnected,
        yamlDoc: yaml.yamlDoc,
        loadedSnapshot: yaml.loadedSnapshot,
        loading: yaml.loading,
        saving: yaml.saving,
        isDirty: yaml.isDirty,
        serverFieldErrors: yaml.serverFieldErrors,
        lastValidationLines: yaml.lastValidationLines,
        urdfWarnings: yaml.urdfWarnings,
        loadConfigName: yaml.loadConfigName,
        setLoadConfigName: yaml.setLoadConfigName,
        resolvedName: yaml.resolvedName,
        hardwareRobotName: table.hardwareRobotName,
        actuatorRows: table.actuatorRows,
        pressureSensorRows: table.pressureSensorRows,
        boardRows: table.boardRows,
        boardsEligibleForNewActuator: table.boardsEligibleForNewActuator,
        actuatorsEligibleForNewPressureSensor: table.actuatorsEligibleForNewPressureSensor,
        addPressureSensorActuatorId: table.addPressureSensorActuatorId,
        setAddPressureSensorActuatorId: table.setAddPressureSensorActuatorId,
        actuatorSearchQuery: table.actuatorSearchQuery,
        setActuatorSearchQuery: table.setActuatorSearchQuery,
        handleAddActuator: mutations.handleAddActuator,
        handleAddPressureSensor: mutations.handleAddPressureSensor,
        serverErrorRows,
        boardColumns,
        actuatorColumns,
        pressureSensorColumns,
        ...server,
    };
}
