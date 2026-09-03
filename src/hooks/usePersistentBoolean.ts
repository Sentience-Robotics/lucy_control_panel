import { useEffect, useState } from 'react';

/**
 * Boolean state mirrored to localStorage under `key`, so panel toggles
 * (floating windows, mostly) survive a reload.
 */
export function usePersistentBoolean(
    key: string,
    defaultValue = false,
): [boolean, React.Dispatch<React.SetStateAction<boolean>>] {
    const [value, setValue] = useState<boolean>(() => {
        if (typeof window === 'undefined') { return defaultValue; }
        const saved = localStorage.getItem(key);
        return saved ? saved === 'true' : defaultValue;
    });

    useEffect(() => {
        if (typeof window === 'undefined') { return; }
        localStorage.setItem(key, String(value));
    }, [key, value]);

    return [value, setValue];
}
