/*
 * Copyright 2025-2026 Sentience Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
    type Dispatch,
    type SetStateAction,
} from 'react';

import { storageService } from '../Services/storage.service';

export const availableDock = [
    'NONE',
    '3D_VIEW',
    'STREAM',
    'TELEOPERATION',
    'SENSOR_DISPLAY',
] as const;

export type Dock = (typeof availableDock)[number];

interface DockContextValue {
    currentDock: Dock;
    setCurrentDock: Dispatch<SetStateAction<Dock>>;
    isDockLoaded: boolean;
}

const DockContext = createContext<DockContextValue | undefined>(
    undefined
);

interface DockProviderProps {
    children: ReactNode;
}

export const DockProvider: React.FC<DockProviderProps> = ({
    children,
}) => {
    const [currentDock, setCurrentDock] = useState<Dock>('3D_VIEW');
    const [isInitialized, setIsInitialized] = useState(false);

    // Load the persisted dock on startup.
    useEffect(() => {
        const loadDock = async () => {
            try {
                const savedDock = await storageService.loadCurrentDock();

                if (
                    savedDock &&
                    availableDock.includes(savedDock as Dock)
                ) {
                    setCurrentDock(savedDock as Dock);
                }
            } catch (error) {
                console.error('Failed to load current dock:', error);
            } finally {
                // Allow saving only after the initial value has been loaded.
                setIsInitialized(true);
            }
        };

        loadDock();
    }, []);

    // Persist changes, but NOT the initial default value.
    useEffect(() => {
        if (!isInitialized) {
            return;
        }

        storageService.saveCurrentDock(currentDock).catch((error) => {
            console.error('Failed to save current dock:', error);
        });
    }, [currentDock, isInitialized]);

    return (
        <DockContext.Provider
            value={{
                currentDock,
                setCurrentDock,
                isDockLoaded: isInitialized,
            }}
        >
            {children}
        </DockContext.Provider>
    );
};

export const useDock = (): DockContextValue => {
    const context = useContext(DockContext);

    if (!context) {
        throw new Error(
            'useDock must be used within a DockProvider'
        );
    }

    return context;
};

export default DockContext;
