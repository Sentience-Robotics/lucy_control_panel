import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Button } from 'antd';
import { FullscreenOutlined, FullscreenExitOutlined } from '@ant-design/icons';
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
    const containerRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const handleImageError = useCallback((e: string | Event) => {
        console.error('[StreamPlayer] Image load error:', e);
    }, []);

    const handleFullscreen = () => {
        const container = containerRef.current;
        if (!container) return;

        if (!document.fullscreenElement) {
            container.requestFullscreen().then(() => setIsFullscreen(true));
        } else {
            document.exitFullscreen().then(() => setIsFullscreen(false));
        }
    };

    useEffect(() => {
        const cameraHandler = CameraHandler.getInstance();

        if (onEmptyDataWarning) {
            cameraHandler.setEmptyDataWarningCallback(onEmptyDataWarning);
        }

        const handleImageData = (data: Uint8Array, frameDelay?: number, fps?: number) => {
            if (!imgRef.current) {
                return;
            }

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

        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);

        return () => {
            cameraHandler.unsubscribeFromCamera(handleImageData);
            cameraHandler.setEmptyDataWarningCallback(() => {});
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, [streamSource, onFrameDelayChange, onFpsChange, onEmptyDataWarning, handleImageError]);

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
            <img
                ref={imgRef}
                id="camera"
                alt=""
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain'
                }}
            />
        </div>
    );
};
