import type { ModalStaticFunctions } from 'antd/es/modal/confirm';
import { message } from 'antd';
import { useRosConnection } from '../../../hooks/useRosConnection.hook.ts';
import { useActiveHardwareRos } from '../../../contexts/ActiveHardwareRosContext.tsx';
import { useHardwareConfigEditor } from './useHardwareConfigEditor.tsx';
import { useHardwareConfigLists } from './useHardwareConfigLists.ts';

export function useHardwareConfiguration(modal: Pick<ModalStaticFunctions, 'confirm'>) {
    const { isConnected } = useRosConnection();
    const {
        activeHardwareDoc,
        activeHardwareConfigName,
        activeHardwareFetchEpoch,
        refetchActiveHardware,
    } = useActiveHardwareRos();
    const [messageApi, contextHolderMessage] = message.useMessage();

    const lists = useHardwareConfigLists(isConnected, messageApi);
    const editor = useHardwareConfigEditor({
        modal,
        messageApi,
        refreshSavedConfigs: lists.refreshSavedConfigs,
        serverActiveConfigName: lists.serverActiveConfigName,
        activeHardwareDoc,
        activeHardwareConfigName,
        activeHardwareFetchEpoch,
        refetchActiveHardware,
    });

    return {
        contextHolderMessage,
        savedConfigNames: lists.savedConfigNames,
        serverActiveConfigName: lists.serverActiveConfigName,
        configListLoading: lists.configListLoading,
        ...editor,
    };
}
