import type { ModalStaticFunctions } from 'antd/es/modal/confirm';
import type { MessageInstance } from 'antd/es/message/interface';
import type { ActiveHardwareFetchResult } from '../../../contexts/ActiveHardwareRosContext.tsx';

export interface HardwareConfigEditorParams {
    modal: Pick<ModalStaticFunctions, 'confirm'>;
    messageApi: MessageInstance;
    refreshSavedConfigs: () => Promise<string | undefined>;
    serverActiveConfigName: string;
    activeHardwareDoc: Record<string, unknown> | null;
    activeHardwareConfigName: string;
    activeHardwareFetchEpoch: number;
    refetchActiveHardware: () => Promise<ActiveHardwareFetchResult>;
}
