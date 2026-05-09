import { useCallback, useEffect, useState } from 'react';
import type { MessageInstance } from 'antd/es/message/interface';
import { HardwareConfigHandler } from '../../../Services/ros/handlers/HardwareConfig.handler.ts';

/**
 * Saved configuration names from `config/list` plus loading state — independent of the YAML editor snapshot.
 */
export function useHardwareConfigLists(isConnected: boolean, messageApi: MessageInstance) {
    const [savedConfigNames, setSavedConfigNames] = useState<string[]>([]);
    const [serverActiveConfigName, setServerActiveConfigName] = useState('');
    const [configListLoading, setConfigListLoading] = useState(false);

    const refreshSavedConfigs = useCallback(async (): Promise<string | undefined> => {
        if (!isConnected) return undefined;
        setConfigListLoading(true);
        try {
            const r = await HardwareConfigHandler.listConfigs();
            if (!r.success) {
                messageApi.warning(r.message || 'config/list failed');
                return undefined;
            }
            const active = r.active_config?.trim() || '';
            setSavedConfigNames([...r.config_names]);
            setServerActiveConfigName(active);
            return active;
        } catch (e) {
            messageApi.error(e instanceof Error ? e.message : 'config/list failed');
            return undefined;
        } finally {
            setConfigListLoading(false);
        }
    }, [isConnected, messageApi]);

    useEffect(() => {
        if (!isConnected) {
            setSavedConfigNames([]);
            setServerActiveConfigName('');
            return;
        }
        void refreshSavedConfigs();
    }, [isConnected, refreshSavedConfigs]);

    return {
        savedConfigNames,
        serverActiveConfigName,
        configListLoading,
        refreshSavedConfigs,
    };
}
