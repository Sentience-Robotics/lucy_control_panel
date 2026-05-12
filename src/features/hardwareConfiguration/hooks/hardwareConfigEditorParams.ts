import type { MessageInstance } from 'antd/es/message/interface';
import type { ActiveHardwareFetchResult } from '../../../contexts/ActiveHardwareRosContext.tsx';

export interface HardwareConfigEditorParams {
    messageApi: MessageInstance;
    /** Mirror `GetConfig.robot_package` into shared context when loading a named preset. */
    recordServerRobotPackage: (robotPackage: string) => void;
    recordServerFlashedMeta: (flashedConfigName: string, flashedAtIso: string) => void;
    refreshSavedConfigs: () => Promise<string | undefined>;
    serverActiveConfigName: string;
    activeHardwareDoc: Record<string, unknown> | null;
    activeHardwareConfigName: string;
    activeHardwareFetchEpoch: number;
    refetchActiveHardware: () => Promise<ActiveHardwareFetchResult>;
}
