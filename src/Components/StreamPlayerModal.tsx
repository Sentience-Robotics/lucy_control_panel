import React, { useRef, useState } from 'react';
import { Button, Space } from 'antd';
import {StreamPlayer} from "./StreamPlayer.tsx";
import { StreamMetrics } from "./StreamMetrics.tsx";

interface StreamPlayerModalProps {
    isVisible: boolean;
    onClose: () => void;
    initialPosition?: { x: number; y: number };
    initialSize?: { w: number; h: number };
    aspectRatio?: number;
}

export default function StreamPlayerModal({
    isVisible,
    onClose,
    initialPosition = { x: 100, y: 100 },
    initialSize = { w: 640, h: 480 },
    aspectRatio = 4 / 3
}: StreamPlayerModalProps) {
    const [{ x, y }, setPos] = useState(initialPosition);
    const [{ w, h }, setSize] = useState(initialSize);
    const [frameDelay, setFrameDelay] = useState<number>(0);
    const [fps, setFps] = useState<number>(0);
    const draggingRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
    const resizingRef = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null);

    if (!isVisible) return null;

    const handleDragStart = (e: React.MouseEvent) => {
        draggingRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            origX: x,
            origY: y
        };

        const onMove = (ev: MouseEvent) => {
            if (!draggingRef.current) return;
            const dx = ev.clientX - draggingRef.current.startX;
            const dy = ev.clientY - draggingRef.current.startY;
            setPos({
                x: Math.max(8, draggingRef.current.origX + dx),
                y: Math.max(8, draggingRef.current.origY + dy)
            });
        };

        const onUp = () => {
            draggingRef.current = null;
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    const handleResizeStart = (e: React.MouseEvent) => {
        e.stopPropagation();
        resizingRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            origW: w,
            origH: h
        };

        const onMove = (ev: MouseEvent) => {
            if (!resizingRef.current) return;
            const dw = ev.clientX - resizingRef.current.startX;
            const dh = ev.clientY - resizingRef.current.startY;

            // Use the larger delta to maintain aspect ratio
            const delta = Math.max(dw, dh);
            const newW = Math.max(260, resizingRef.current.origW + delta);
            const newH = Math.max(195, newW / aspectRatio);

            setSize({ w: newW, h: newH });
        };

        const onUp = () => {
            resizingRef.current = null;
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    return (
        <div
            style={{
                position: 'fixed',
                left: x,
                top: y,
                width: w,
                height: h,
                zIndex: 1000,
                backgroundColor: '#0b0b0b',
                border: '1px solid #333',
                borderRadius: 8,
                boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                overflow: 'hidden',
                userSelect: 'none',
            }}
        >
            {/* Header Bar */}
            <div
                onMouseDown={handleDragStart}
                style={{
                    height: 36,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 8px',
                    background: 'linear-gradient(180deg, #121212, #0b0b0b)',
                    borderBottom: '1px solid #222',
                    cursor: 'move',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ color: '#00ff41', fontFamily: 'monospace', fontSize: 12 }}>
                        STREAM
                    </span>
                    <StreamMetrics fps={fps} frameDelay={frameDelay} />
                </div>
                <Space size={6} align="center">
                    <Button size="small" danger onClick={onClose}>
                        X
                    </Button>
                </Space>
            </div>

            {/* Stream Content */}
            <StreamPlayer onFrameDelayChange={setFrameDelay} onFpsChange={setFps} />

            {/* Resize Handle */}
            <div
                onMouseDown={handleResizeStart}
                style={{
                    position: 'absolute',
                    right: 0,
                    bottom: 0,
                    width: 14,
                    height: 14,
                    cursor: 'nwse-resize',
                    background: 'linear-gradient(135deg, transparent 50%, #333 50%)',
                }}
            />
        </div>
    );
}