import React, { useEffect, useRef } from 'react';

import { CameraHandler } from "../Services/ros/handlers/Camera.handler";

interface StreamPlayerProps {
    onFrameDelayChange?: (delay: number) => void;
    onFpsChange?: (fps: number) => void;
}

export const StreamPlayer: React.FC<StreamPlayerProps> = ({ onFrameDelayChange, onFpsChange }) => {
    const imgRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
        const cameraHandler = CameraHandler.getInstance();

        const handleImageData = (data: Uint8Array, frameDelay?: number, fps?: number) => {
            if (!imgRef.current) return;

            const standardArray = new Uint8Array(data);
            const blob = new Blob([standardArray], { type: 'image/jpeg' });

            const url = URL.createObjectURL(blob);
            imgRef.current.src = url;

            if (onFrameDelayChange && frameDelay !== undefined) {
                onFrameDelayChange(frameDelay);
            }

            if (onFpsChange && fps !== undefined) {
                onFpsChange(fps);
            }

            setTimeout(() => URL.revokeObjectURL(url), 100);
        };

        cameraHandler.subscribeToCamera(handleImageData);

        return () => {
            cameraHandler.unsubscribeFromCamera(handleImageData);
        };
    }, []);

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
