import React, { useRef, useState, type ReactNode } from 'react';
import { Button, Space, Grid } from 'antd';
import {
    UI_ACCENT_GREEN,
    UI_BORDER_DIM,
    UI_BORDER_MUTED,
    UI_CHROME_SURFACE,
    UI_MODAL_SURFACE,
    UI_SHADOW_ELEVATED,
    UI_TEXT_PRIMARY_ON_DARK,
    UI_TEXT_SUBTLE,
} from '../Constants/uiTheme.ts';

const { useBreakpoint } = Grid;

interface MediapipeHandTrackerModalProps {
    children: ReactNode;
    header?: ReactNode;
    footer?: ReactNode;
    modalName: string;
    isVisible: boolean;
    onClose: () => void;
    initialPosition?: { x: number; y: number };
    initialSize?: { w: number; h: number };
    contentPadding?: number | string;
    mobileFixedTop?: boolean;
    mobileTopOffset?: number;
}

export function MovableModal({
    children,
    header,
    footer,
    modalName,
    isVisible,
    onClose,
    initialPosition = { x: 100, y: 120 },
    initialSize = { w: 350, h: 650 },
    contentPadding = 24,
    mobileFixedTop = false,
    mobileTopOffset = 0,
}: MediapipeHandTrackerModalProps) {
    const screens = useBreakpoint();
    const isMobile = !screens.md;
    const [{ x, y }, setPos] = useState(isMobile ? { x: 20, y: 120 } : initialPosition);
    const [{ w, h }, setSize] = useState(initialSize);
    const draggingRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
    const resizingRef = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null);
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
            const newW = Math.max(260, resizingRef.current.origW + dw);
            const newH = Math.max(195, resizingRef.current.origH + dh);

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
                borderRadius: 0,
                boxShadow: UI_SHADOW_ELEVATED,
                overflow: 'hidden',
                overscrollBehavior: 'contain',
                userSelect: 'none',
            }}
        >
            {/* Header Bar */}
            <div
                onMouseDown={isLocked ? undefined : handleDragStart}
                style={{
                    height: 56,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 24px',
                    backgroundColor: UI_MODAL_SURFACE,
                    borderBottom: `1px solid ${UI_BORDER_DIM}`,
                    cursor: isLocked ? 'default' : 'move',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
                    <span style={{
                        color: UI_ACCENT_GREEN,
                        fontFamily: 'monospace',
                        fontSize: 14,
                        fontWeight: 600,
                        letterSpacing: '0.04em',
                        whiteSpace: 'nowrap',
                    }}>
                        {modalName}
                    </span>
                    {header}
                </div>
                <Space size={6} align="center" style={{ marginLeft: 16 }}>
                    <Button
                        type="text"
                        size="small"
                        onClick={onClose}
                        aria-label={`Close ${modalName}`}
                        style={{
                            color: UI_TEXT_SUBTLE,
                            backgroundColor: 'transparent',
                            borderColor: 'transparent',
                            fontSize: 16,
                            lineHeight: 1,
                            padding: '4px 8px',
                        }}
                        onMouseEnter={(event) => {
                            event.currentTarget.style.color = UI_TEXT_PRIMARY_ON_DARK;
                            event.currentTarget.style.backgroundColor = UI_CHROME_SURFACE;
                        }}
                        onMouseLeave={(event) => {
                            event.currentTarget.style.color = UI_TEXT_SUBTLE;
                            event.currentTarget.style.backgroundColor = 'transparent';
                        }}
                    >
                        X
                    </Button>
                </Space>
            </div>
            <div
                style={{
                    padding: contentPadding,
                    boxSizing: 'border-box',
                    height: footer ? 'calc(100% - 56px - 57px)' : 'calc(100% - 56px)',
                    overflow: 'auto',
                    overscrollBehavior: 'contain',
                }}
            >
                {children}
            </div>
            {footer ? (
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        alignItems: 'center',
                        gap: 8,
                        padding: '12px 24px',
                        borderTop: `1px solid ${UI_BORDER_DIM}`,
                        backgroundColor: UI_CHROME_SURFACE,
                    }}
                >
                    {footer}
                </div>
            ) : null}

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
