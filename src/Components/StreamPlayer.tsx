/*
 * Copyright 2025-2026 Sentience Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { CameraHandler } from "../Services/ros/handlers/Camera.handler";
import type { StreamSource } from "../Constants/rosConfig";

interface StreamPlayerProps {
    onFrameDelayChange?: (delay: number) => void;
    onFpsChange?: (fps: number) => void;
    streamSource?: StreamSource;
    onEmptyDataWarning?: (hasWarning: boolean) => void;
    onAspectRatioChange?: (ratio: number) => void;
}

const URL_CLEANUP_DELAY_MS = 100;

export const StreamPlayer: React.FC<StreamPlayerProps> = ({ onFrameDelayChange, onFpsChange, streamSource, onEmptyDataWarning, onAspectRatioChange }) => {
    const imgRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const reportedRatioRef = useRef<number | null>(null);

    const handleImageError = useCallback((e: string | Event) => {
        console.error('[StreamPlayer] Image load error:', e);
    }, []);

    const handleImageLoad = useCallback(() => {
        const image = imgRef.current;
        if (!image?.naturalWidth || !image.naturalHeight) {
            return;
        }

        const ratio = image.naturalWidth / image.naturalHeight;
        if (reportedRatioRef.current === ratio) {
            return;
        }

        reportedRatioRef.current = ratio;
        onAspectRatioChange?.(ratio);
    }, [onAspectRatioChange]);

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
            imgRef.current.onload = handleImageLoad;
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
            cameraHandler.setEmptyDataWarningCallback(() => {});
        };
    }, [streamSource, onFrameDelayChange, onFpsChange, onEmptyDataWarning, handleImageError, handleImageLoad]);

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
