import { useCallback, useEffect, useState } from 'react';
import { type ConnectionStatus, RosBridgeService } from "../Services/ros/ros.service.ts";

interface UseRosConnectionReturn {
    connectionStatus: ConnectionStatus;
    isConnected: boolean;
    isConnecting: boolean;
    isDisconnected: boolean;
    currentUrl: string;
    connect: (url: string) => Promise<void>;
    disconnect: () => void;
}

export function useRosConnection(): UseRosConnectionReturn {
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
    const rosService = RosBridgeService.getInstance();

    useEffect(() => {
        setConnectionStatus(rosService.connectionStatus);

        return rosService.onStatusChange((status) => {
            setConnectionStatus(status);
        });
    }, [rosService]);

    const connect = useCallback(async (url: string) => {
        try {
            await rosService.connect(url);
        } catch (error) {
            console.error('Failed to connect:', error);
            throw error;
        }
    }, [rosService]);

    const disconnect = useCallback(() => {
        rosService.disconnect();
    }, [rosService]);

    return {
        connectionStatus,
        isConnected: connectionStatus === 'connected',
        isConnecting: connectionStatus === 'connecting',
        isDisconnected: connectionStatus === 'disconnected',
        currentUrl: rosService.currentUrl,
        connect,
        disconnect
    };
}
