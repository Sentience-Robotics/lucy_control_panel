import React, { useRef, useState, type ReactNode } from 'react';
import { Button, Space, Grid } from 'antd';
import {
    UI_ACCENT_GREEN,
    UI_BORDER_DIM,
    UI_BORDER_MUTED,
    UI_GRADIENT_MODAL_HEADER,
    UI_MODAL_SURFACE,
    UI_SHADOW_ELEVATED,
} from '../Constants/uiTheme.ts';

const { useBreakpoint } = Grid;

interface MediapipeHandTrackerModalProps {
    children: ReactNode;
    header?: ReactNode;
    modalName: string;
    isVisible: boolean;
    onClose: () => void;
    initialPosition?: { x: number; y: number };
    initialSize?: { w: number; h: number };
    aspectRatio?: number;
    mobileFixedTop?: boolean;
    mobileTopOffset?: number;
}

export function MovableModal({
    children,
    header,
    modalName,
    isVisible,
    onClose,
    initialPosition = { x: 100, y: 100 },
    initialSize = { w: 480, h: 320 },
    aspectRatio = 4 / 3,
    mobileFixedTop = false,
    mobileTopOffset = 0,
}: MediapipeHandTrackerModalProps) {
    const [{ x, y }, setPos] = useState(initialPosition);
    const [{ w, h }, setSize] = useState(initialSize);
    const draggingRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
    const resizingRef = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null);
    const screens = useBreakpoint();
    const isLocked = mobileFixedTop && !screens.md;

    if (!isVisible) { return null; }

    const handleDragStart = (e: React.MouseEvent) => {
        draggingRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            origX: x,
            origY: y
        };

        const onMove = (ev: MouseEvent) => {
            if (!draggingRef.current) { return; }
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
            if (!resizingRef.current) { return; }
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

                position: isLocked ? 'sticky' : 'fixed',
                left: isLocked ? undefined : x,
                top: isLocked ? mobileTopOffset : y,
                width: isLocked ? '100%' : w,
                height: isLocked ? '33.333vh' : h,
                marginBottom: isLocked ? 12 : undefined,
                zIndex: isLocked ? 1 : 1000,
                backgroundColor: UI_MODAL_SURFACE,
                border: `1px solid ${UI_BORDER_MUTED}`,
                borderRadius: 8,
                boxShadow: UI_SHADOW_ELEVATED,
                overflow: 'hidden',
                userSelect: 'none',
            }}
        >
            {/* Header Bar */}
            <div
                onMouseDown={isLocked ? undefined : handleDragStart}
                style={{
                    height: 36,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 8px',
                    background: UI_GRADIENT_MODAL_HEADER,
                    borderBottom: `1px solid ${UI_BORDER_DIM}`,
                    cursor: isLocked ? 'default' : 'move',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ color: UI_ACCENT_GREEN, fontFamily: 'monospace', fontSize: 12 }}>
                        {modalName}
                    </span>
                    {header}
                </div>
                <Space size={6} align="center">
                    <Button size="small" danger onClick={onClose}>
                        X
                    </Button>
                </Space>
            </div>
            {children}

            {/* Resize Handle */}
            {!isLocked && (
                <div
                    onMouseDown={handleResizeStart}
                    style={{
                        position: 'absolute',
                        right: 0,
                        bottom: 0,
                        width: 14,
                        height: 14,
                        cursor: 'nwse-resize',
                        background: `linear-gradient(135deg, transparent 50%, ${UI_BORDER_MUTED} 50%)`,
                    }}
                />
            )}
        </div>
    );
}
