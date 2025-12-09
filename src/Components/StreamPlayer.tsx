import React, { useEffect, useRef, useCallback } from 'react';

import { CameraHandler } from "../Services/ros/handlers/Camera.handler";
import type { StreamSource } from "../Constants/rosConfig";

interface StreamPlayerProps {
    onFrameDelayChange?: (delay: number) => void;
    onFpsChange?: (fps: number) => void;
    streamSource?: StreamSource;
    onEmptyDataWarning?: (hasWarning: boolean) => void;
}

const URL_CLEANUP_DELAY_MS = 100;

export const StreamPlayer: React.FC<StreamPlayerProps> = ({ onFrameDelayChange, onFpsChange, streamSource, onEmptyDataWarning }) => {
    const imgRef = useRef<HTMLImageElement>(null);

    const handleImageError = useCallback((e: string | Event) => {
        console.error('[StreamPlayer] Image load error:', e);
    }, []);

    useEffect(() => {
        const cameraHandler = CameraHandler.getInstance();

        // Set up empty data warning callback
        if (onEmptyDataWarning) {
            cameraHandler.setEmptyDataWarningCallback(onEmptyDataWarning);
        }

        const handleImageData = (data: Uint8Array, frameDelay?: number, fps?: number) => {
            if (!imgRef.current) {
                return;
            }

            // Create a new Uint8Array to ensure proper type compatibility with Blob
            const imageData = new Uint8Array(data);
            const blob = new Blob([imageData as BlobPart], { type: 'image/jpeg' });
            const url = URL.createObjectURL(blob);

            imgRef.current.onerror = handleImageError as OnErrorEventHandler;
            imgRef.current.src = url;

            if (onFrameDelayChange && frameDelay !== undefined) {
                onFrameDelayChange(frameDelay);
            }

            if (onFpsChange && fps !== undefined) {
                onFpsChange(fps);
            }

            setTimeout(() => URL.revokeObjectURL(url), URL_CLEANUP_DELAY_MS);
        };

        cameraHandler.subscribeToCamera(handleImageData, streamSource);

        return () => {
            cameraHandler.unsubscribeFromCamera(handleImageData);
            cameraHandler.setEmptyDataWarningCallback(() => {}); // Clear callback
        };
    }, [streamSource, onFrameDelayChange, onFpsChange, onEmptyDataWarning, handleImageError]);

    return (
        <img
            ref={imgRef}
            id="camera"
            alt="Toggle the stream feed update to see the content"
            style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain'
            }}
        />
    );
};
