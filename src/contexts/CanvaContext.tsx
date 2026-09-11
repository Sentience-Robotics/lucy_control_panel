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

export const availableCanva = [
    'NONE',
    '3D_VIEW',
    'STREAM',
] as const;

export type Canva = (typeof availableCanva)[number];

interface CanvaContextValue {
    currentCanva: Canva;
    setCurrentCanva: Dispatch<SetStateAction<Canva>>;
    /** False until the persisted canva has been restored; `currentCanva` is only the default before that. */
    isCanvaLoaded: boolean;
}

const CanvaContext = createContext<CanvaContextValue | undefined>(
    undefined
);

interface CanvaProviderProps {
    children: ReactNode;
}

export const CanvaProvider: React.FC<CanvaProviderProps> = ({
    children,
}) => {
    const [currentCanva, setCurrentCanva] = useState<Canva>('3D_VIEW');
    const [isInitialized, setIsInitialized] = useState(false);

    // Load the persisted canva on startup.
    useEffect(() => {
        const loadCanva = async () => {
            try {
                const savedCanva = await storageService.loadCurrentCanva();

                if (
                    savedCanva &&
                    availableCanva.includes(savedCanva as Canva)
                ) {
                    setCurrentCanva(savedCanva as Canva);
                }
            } catch (error) {
                console.error('Failed to load current canva:', error);
            } finally {
                // Allow saving only after the initial value has been loaded.
                setIsInitialized(true);
            }
        };

        loadCanva();
    }, []);

    // Persist changes, but NOT the initial default value.
    useEffect(() => {
        if (!isInitialized) {
            return;
        }

        storageService.saveCurrentCanva(currentCanva).catch((error) => {
            console.error('Failed to save current canva:', error);
        });
    }, [currentCanva, isInitialized]);

    return (
        <CanvaContext.Provider
            value={{
                currentCanva,
                setCurrentCanva,
                isCanvaLoaded: isInitialized,
            }}
        >
            {children}
        </CanvaContext.Provider>
    );
};

export const useCanva = (): CanvaContextValue => {
    const context = useContext(CanvaContext);

    if (!context) {
        throw new Error(
            'useCanva must be used within a CanvaProvider'
        );
    }

    return context;
};

export default CanvaContext;
