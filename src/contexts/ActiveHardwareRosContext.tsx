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
    /** ROS package wired on lucy_config_pipeline (echo of GetConfig.robot_package); empty until fetched. */
    serverRobotPackage: string;
    /** Parsed active.yaml / pipeline active preset — system truth after successful fetch; cleared when disconnected. */
    activeHardwareDoc: Record<string, unknown> | null;
    activeHardwareConfigName: string;
    /** Last preset recorded after pipeline flash (GetConfig.flashed_config_name); cleared when disconnected. */
    serverFlashedConfigName: string;
    serverFlashedAt: string;
    /** Derived joint/command routing when connected and fetch succeeded (possibly empty array). */
    controllerConfigsFromActive: ControllerJointConfig[] | null;
    activeHardwareLoading: boolean;
    activeHardwareError: string | null;
    /** Increments on each successful `config/get` active fetch — editors may gate hydration on this. */
    activeHardwareFetchEpoch: number;
    /** Calls `/config/get` with empty name; updates shared snapshot used by control + configuration pages. */
    refetchActiveHardware: () => Promise<ActiveHardwareFetchResult>;
    /** Non-empty robot_package strings from Config/get should be mirrored here (named loads too). */
    recordServerRobotPackage: (robotPackage: string) => void;
    /** `/config/get` also returns flashed preset meta — keep toolbar FLASHED in sync on named loads. */
    recordServerFlashedMeta: (flashedConfigName: string, flashedAtIso: string) => void;
}

const ActiveHardwareRosContext = createContext<ActiveHardwareRosContextValue | null>(null);

export function ActiveHardwareRosProvider({ children }: { children: React.ReactNode }) {
    const { isConnected } = useRosConnection();
    const [activeHardwareDoc, setActiveHardwareDoc] = useState<Record<string, unknown> | null>(null);
    const [activeHardwareConfigName, setActiveHardwareConfigName] = useState('');
    const [serverFlashedConfigName, setServerFlashedConfigName] = useState('');
    const [serverFlashedAt, setServerFlashedAt] = useState('');
    const [controllerConfigsFromActive, setControllerConfigsFromActive] = useState<
        ControllerJointConfig[] | null
    >(null);
    const [activeHardwareLoading, setActiveHardwareLoading] = useState(false);
    const [activeHardwareError, setActiveHardwareError] = useState<string | null>(null);
    const [epoch, setEpoch] = useState(0);
    const [serverRobotPackage, setServerRobotPackage] = useState('');

    const recordServerRobotPackage = useCallback((robotPackage: string) => {
        const t = robotPackage.trim();
        if (!t) return;
        setServerRobotPackage((prev) => (prev === t ? prev : t));
    }, []);

    const recordServerFlashedMeta = useCallback((flashedConfigName: string, flashedAtIso: string) => {
        setServerFlashedConfigName(flashedConfigName.trim());
        setServerFlashedAt(flashedAtIso.trim());
    }, []);

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
                setServerFlashedConfigName('');
                setServerFlashedAt('');
                return { ok: false, message: msg };
            }
            const pkg = typeof res.robot_package === 'string' ? res.robot_package.trim() : '';
            if (pkg) {
                setServerRobotPackage(pkg);
            }
            const doc = parseHardwareConfigYaml(res.config_yaml || '');
            const ctrls = controllerJointConfigsFromHardwareYaml(doc);
            setActiveHardwareDoc(doc);
            setActiveHardwareConfigName(res.config_name || '');
            setServerFlashedConfigName((res.flashed_config_name || '').trim());
            setServerFlashedAt((res.flashed_at || '').trim());
            setControllerConfigsFromActive(ctrls);
            setEpoch((e) => e + 1);
            return { ok: true, doc, configName: res.config_name || '' };
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Failed to load active hardware config';
            setActiveHardwareError(msg);
            setActiveHardwareDoc(null);
            setControllerConfigsFromActive(null);
            setServerFlashedConfigName('');
            setServerFlashedAt('');
            return { ok: false, message: msg };
        } finally {
            setActiveHardwareLoading(false);
        }
    }, [isConnected]);

    useEffect(() => {
        if (!isConnected) {
            setActiveHardwareDoc(null);
            setActiveHardwareConfigName('');
            setServerFlashedConfigName('');
            setServerFlashedAt('');
            setControllerConfigsFromActive(null);
            setActiveHardwareError(null);
            setActiveHardwareLoading(false);
            setServerRobotPackage('');
            return;
        }
        void refetchActiveHardware();
    }, [isConnected, refetchActiveHardware]);

    const value = useMemo(
        (): ActiveHardwareRosContextValue => ({
            serverRobotPackage,
            activeHardwareDoc,
            activeHardwareConfigName,
            serverFlashedConfigName,
            serverFlashedAt,
            controllerConfigsFromActive,
            activeHardwareLoading,
            activeHardwareError,
            activeHardwareFetchEpoch: epoch,
            refetchActiveHardware,
            recordServerRobotPackage,
            recordServerFlashedMeta,
        }),
        [
            serverRobotPackage,
            activeHardwareDoc,
            activeHardwareConfigName,
            serverFlashedConfigName,
            serverFlashedAt,
            controllerConfigsFromActive,
            activeHardwareLoading,
            activeHardwareError,
            epoch,
            refetchActiveHardware,
            recordServerRobotPackage,
            recordServerFlashedMeta,
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
