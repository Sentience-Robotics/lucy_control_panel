import { useCallback, useEffect, useRef, useState } from 'react';

export interface HardwareYamlEditorStateParams {
    isConnected: boolean;
    activeHardwareDoc: Record<string, unknown> | null;
    activeHardwareConfigName: string;
    activeHardwareFetchEpoch: number;
}

/**
 * Working copy of the hardware YAML, load/save lifecycle flags, and validation metadata from the system.
 */
export function useHardwareYamlEditorState({
    isConnected,
    activeHardwareDoc,
    activeHardwareConfigName,
    activeHardwareFetchEpoch,
}: HardwareYamlEditorStateParams) {
    const isDirtyRef = useRef(false);
    const actuatorIdOnFocusRef = useRef<Record<number, string>>({});

    const [loadConfigName, setLoadConfigName] = useState('');
    const [resolvedName, setResolvedName] = useState('');
    const [yamlDoc, setYamlDoc] = useState<Record<string, unknown> | null>(null);
    const [loadedSnapshot, setLoadedSnapshot] = useState<Record<string, unknown> | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [serverFieldErrors, setServerFieldErrors] = useState<Map<string, string[]>>(new Map());
    const [lastValidationLines, setLastValidationLines] = useState<string[]>([]);
    const [urdfWarnings, setUrdfWarnings] = useState<string[]>([]);

    useEffect(() => {
        if (!isConnected) {
            setLoadConfigName('');
        }
    }, [isConnected]);

    useEffect(() => {
        isDirtyRef.current = isDirty;
    }, [isDirty]);

    useEffect(() => {
        if (!isConnected || activeHardwareDoc === null || activeHardwareFetchEpoch === 0) return;
        if (isDirtyRef.current) return;
        const snap = structuredClone(activeHardwareDoc);
        setYamlDoc(snap);
        setLoadedSnapshot(structuredClone(snap));
        setResolvedName(activeHardwareConfigName);
        setLoadConfigName(activeHardwareConfigName);
        setIsDirty(false);
        setServerFieldErrors(new Map());
        setLastValidationLines([]);
        setUrdfWarnings([]);
    }, [isConnected, activeHardwareFetchEpoch, activeHardwareDoc, activeHardwareConfigName]);

    const clearServerValidation = useCallback(() => {
        setServerFieldErrors(new Map());
        setLastValidationLines([]);
        setUrdfWarnings([]);
    }, []);

    const patchDoc = useCallback(
        (next: Record<string, unknown>) => {
            setYamlDoc(next);
            setIsDirty(true);
            clearServerValidation();
        },
        [clearServerValidation],
    );

    return {
        isDirtyRef,
        actuatorIdOnFocusRef,
        loadConfigName,
        setLoadConfigName,
        resolvedName,
        setResolvedName,
        yamlDoc,
        setYamlDoc,
        loadedSnapshot,
        setLoadedSnapshot,
        loading,
        setLoading,
        saving,
        setSaving,
        isDirty,
        setIsDirty,
        serverFieldErrors,
        setServerFieldErrors,
        lastValidationLines,
        setLastValidationLines,
        urdfWarnings,
        setUrdfWarnings,
        patchDoc,
        clearServerValidation,
    };
}
