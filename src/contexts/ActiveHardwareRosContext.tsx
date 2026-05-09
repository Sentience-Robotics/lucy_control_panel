import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';
import type { ControllerJointConfig } from '../Constants/rosConfig';
import { useRosConnection } from '../hooks/useRosConnection.hook';
import { HardwareConfigHandler } from '../Services/ros/handlers/HardwareConfig.handler';
import { parseHardwareConfigYaml } from '../Utils/hardwareConfigYaml';
import { controllerJointConfigsFromHardwareYaml } from '../Utils/hardwareControllersFromYaml.ts';

export type ActiveHardwareFetchOk = {
    ok: true;
    doc: Record<string, unknown>;
    configName: string;
};
export type ActiveHardwareFetchFail = { ok: false; message: string };
export type ActiveHardwareFetchResult = ActiveHardwareFetchOk | ActiveHardwareFetchFail;

interface ActiveHardwareRosContextValue {
    /** Parsed active.yaml / pipeline active preset — server truth after successful fetch; cleared when disconnected. */
    activeHardwareDoc: Record<string, unknown> | null;
    activeHardwareConfigName: string;
    /** Derived joint/command routing when connected and fetch succeeded (possibly empty array). */
    controllerConfigsFromActive: ControllerJointConfig[] | null;
    activeHardwareLoading: boolean;
    activeHardwareError: string | null;
    /** Increments on each successful `config/get` active fetch — editors may gate hydration on this. */
    activeHardwareFetchEpoch: number;
    /** Calls `/config/get` with empty name; updates shared snapshot used by control + configuration pages. */
    refetchActiveHardware: () => Promise<ActiveHardwareFetchResult>;
}

const ActiveHardwareRosContext = createContext<ActiveHardwareRosContextValue | null>(null);

export function ActiveHardwareRosProvider({ children }: { children: React.ReactNode }) {
    const { isConnected } = useRosConnection();
    const [activeHardwareDoc, setActiveHardwareDoc] = useState<Record<string, unknown> | null>(null);
    const [activeHardwareConfigName, setActiveHardwareConfigName] = useState('');
    const [controllerConfigsFromActive, setControllerConfigsFromActive] = useState<
        ControllerJointConfig[] | null
    >(null);
    const [activeHardwareLoading, setActiveHardwareLoading] = useState(false);
    const [activeHardwareError, setActiveHardwareError] = useState<string | null>(null);
    const [epoch, setEpoch] = useState(0);

    const refetchActiveHardware = useCallback(async (): Promise<ActiveHardwareFetchResult> => {
        if (!isConnected) {
            return { ok: false, message: 'Not connected to ROS bridge.' };
        }
        setActiveHardwareLoading(true);
        setActiveHardwareError(null);
        try {
            const res = await HardwareConfigHandler.getConfig('');
            if (!res.success) {
                const msg = res.message || 'Failed to load active hardware config';
                setActiveHardwareError(msg);
                setActiveHardwareDoc(null);
                setControllerConfigsFromActive(null);
                return { ok: false, message: msg };
            }
            const doc = parseHardwareConfigYaml(res.config_yaml || '');
            const ctrls = controllerJointConfigsFromHardwareYaml(doc);
            setActiveHardwareDoc(doc);
            setActiveHardwareConfigName(res.config_name || '');
            setControllerConfigsFromActive(ctrls);
            setEpoch((e) => e + 1);
            return { ok: true, doc, configName: res.config_name || '' };
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Failed to load active hardware config';
            setActiveHardwareError(msg);
            setActiveHardwareDoc(null);
            setControllerConfigsFromActive(null);
            return { ok: false, message: msg };
        } finally {
            setActiveHardwareLoading(false);
        }
    }, [isConnected]);

    useEffect(() => {
        if (!isConnected) {
            setActiveHardwareDoc(null);
            setActiveHardwareConfigName('');
            setControllerConfigsFromActive(null);
            setActiveHardwareError(null);
            setActiveHardwareLoading(false);
            return;
        }
        void refetchActiveHardware();
    }, [isConnected, refetchActiveHardware]);

    const value = useMemo(
        (): ActiveHardwareRosContextValue => ({
            activeHardwareDoc,
            activeHardwareConfigName,
            controllerConfigsFromActive,
            activeHardwareLoading,
            activeHardwareError,
            activeHardwareFetchEpoch: epoch,
            refetchActiveHardware,
        }),
        [
            activeHardwareDoc,
            activeHardwareConfigName,
            controllerConfigsFromActive,
            activeHardwareLoading,
            activeHardwareError,
            epoch,
            refetchActiveHardware,
        ],
    );

    return (
        <ActiveHardwareRosContext.Provider value={value}>{children}</ActiveHardwareRosContext.Provider>
    );
}

export function useActiveHardwareRos(): ActiveHardwareRosContextValue {
    const ctx = useContext(ActiveHardwareRosContext);
    if (!ctx) {
        throw new Error('useActiveHardwareRos must be used within ActiveHardwareRosProvider');
    }
    return ctx;
}
