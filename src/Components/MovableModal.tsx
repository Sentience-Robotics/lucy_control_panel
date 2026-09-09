import React, { useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button, Space, Grid } from 'antd';
import {
    UI_ACCENT_GREEN,
    UI_BORDER_DIM,
    UI_BORDER_MUTED,
    UI_CHROME_SURFACE,
    UI_MODAL_SURFACE,
    UI_OVERLAY_BACKDROP_SOFT,
    UI_SHADOW_ELEVATED,
    UI_TEXT_PRIMARY_ON_DARK,
    UI_TEXT_SUBTLE,
} from '../Constants/uiTheme.ts';

const { useBreakpoint } = Grid;

interface ModalPosition {
    x: number;
    y: number;
}

interface ModalSize {
    w: number;
    h: number;
}

interface RegisteredModal {
    position: ModalPosition;
    size: ModalSize;
}

const registeredModals = new Map<symbol, RegisteredModal>();
const VIEWPORT_MARGIN = 8;
const PLACEMENT_STEP = 24;
const HEADER_HEIGHT = 40;
const BORDER_WIDTH = 1;
const MIN_MODAL_HEIGHT = 195;

const clampPosition = (position: ModalPosition, size: ModalSize): ModalPosition => {
    const maxX = Math.max(VIEWPORT_MARGIN, window.innerWidth - size.w - VIEWPORT_MARGIN);
    const maxY = Math.max(VIEWPORT_MARGIN, window.innerHeight - size.h - VIEWPORT_MARGIN);

    return {
        x: Math.min(Math.max(VIEWPORT_MARGIN, position.x), maxX),
        y: Math.min(Math.max(VIEWPORT_MARGIN, position.y), maxY),
    };
};

const overlaps = (first: RegisteredModal, second: RegisteredModal) => (
    first.position.x < second.position.x + second.size.w
    && first.position.x + first.size.w > second.position.x
    && first.position.y < second.position.y + second.size.h
    && first.position.y + first.size.h > second.position.y
);

const findAvailablePosition = (preferredPosition: ModalPosition, size: ModalSize, id: symbol): ModalPosition => {
    const preferred = clampPosition(preferredPosition, size);
    const occupied = Array.from(registeredModals.entries())
        .filter(([registeredId]) => registeredId !== id)
        .map(([, modal]) => modal);
    const fits = (position: ModalPosition) => {
        const candidate = { position, size };
        return occupied.every(modal => !overlaps(candidate, modal));
    };

    if (fits(preferred)) {
        return preferred;
    }

    const maxX = Math.max(VIEWPORT_MARGIN, window.innerWidth - size.w - VIEWPORT_MARGIN);
    const maxY = Math.max(VIEWPORT_MARGIN, window.innerHeight - size.h - VIEWPORT_MARGIN);
    for (let y = VIEWPORT_MARGIN; y <= maxY; y += PLACEMENT_STEP) {
        for (let x = VIEWPORT_MARGIN; x <= maxX; x += PLACEMENT_STEP) {
            const candidate = { x, y };
            if (fits(candidate)) {
                return candidate;
            }
        }
    }

    // The viewport is fully occupied; retaining the preferred position is the least surprising fallback.
    return preferred;
};

interface MovableModalProps {
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
    footerWrap?: boolean;
    minWidth?: number;
    contentAspectRatio?: number | null;
    /** Pins the modal to the centre of a blurred backdrop that closes it on click. Height follows the content. */
    centered?: boolean;
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
    footerWrap = true,
    minWidth = 260,
    contentAspectRatio = null,
    centered = false,
}: MovableModalProps) {
    const screens = useBreakpoint();
    const isMobile = !screens.md;
    const hasResolvedBreakpoint = screens.md !== undefined;
    const hasInitializedPositionRef = useRef(hasResolvedBreakpoint);
    const [{ x, y }, setPos] = useState(isMobile ? { x: 20, y: 120 } : initialPosition);
    const [{ w, h }, setSize] = useState(initialSize);
    const modalIdRef = useRef(Symbol(modalName));
    const wasVisibleRef = useRef(false);
    const hasOpenedRef = useRef(false);
    const draggingRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
    const resizingRef = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null);
    const isLocked = mobileFixedTop && !screens.md && !centered;
    // Centered modals are placed by their backdrop, so they skip dragging, resizing and auto-placement.
    const isPinned = centered || isLocked;

    const framePadding = typeof contentPadding === 'number' ? contentPadding : 0;
    const chromeWidth = framePadding * 2 + BORDER_WIDTH * 2;
    const chromeHeight = HEADER_HEIGHT + framePadding * 2 + BORDER_WIDTH * 2;

    const sizeForContentWidth = React.useCallback((contentWidth: number, ratio: number): ModalSize => {
        const minContentWidth = Math.max(1, minWidth - chromeWidth);
        const minContentHeight = Math.max(1, MIN_MODAL_HEIGHT - chromeHeight);
        let width = Math.max(minContentWidth, contentWidth);
        let height = width / ratio;

        if (height < minContentHeight) {
            height = minContentHeight;
            width = height * ratio;
        }

        return { w: Math.round(width + chromeWidth), h: Math.round(height + chromeHeight) };
    }, [chromeHeight, chromeWidth, minWidth]);

    // Snap to the ratio as soon as it is known, and whenever the stream changes shape.
    React.useEffect(() => {
        if (!contentAspectRatio) { return; }
        setSize(current => sizeForContentWidth(current.w - chromeWidth, contentAspectRatio));
    }, [chromeWidth, contentAspectRatio, sizeForContentWidth]);

    React.useEffect(() => {
        if (!hasResolvedBreakpoint || hasInitializedPositionRef.current) return;
        hasInitializedPositionRef.current = true;
        setPos(isMobile ? { x: 20, y: 120 } : initialPosition);
    }, [hasResolvedBreakpoint, initialPosition, isMobile]);

    React.useEffect(() => {
        const modalId = modalIdRef.current;
        if (!hasResolvedBreakpoint || !isVisible || isLocked || centered) {
            registeredModals.delete(modalId);
            wasVisibleRef.current = false;
            return;
        }

        if (!wasVisibleRef.current) {
            const preferredPosition = hasOpenedRef.current || isMobile ? { x, y } : initialPosition;
            const position = findAvailablePosition(preferredPosition, { w, h }, modalId);
            setPos(position);
            registeredModals.set(modalId, { position, size: { w, h } });
            wasVisibleRef.current = true;
            hasOpenedRef.current = true;
        } else {
            registeredModals.set(modalId, { position: { x, y }, size: { w, h } });
        }

        return () => {
            registeredModals.delete(modalId);
        };
    }, [centered, h, hasResolvedBreakpoint, initialPosition, isLocked, isMobile, isVisible, w, x, y]);

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

            if (contentAspectRatio) {
                const projected = (dw * contentAspectRatio + dh) / (contentAspectRatio * contentAspectRatio + 1);
                const contentWidth = resizingRef.current.origW - chromeWidth + projected * contentAspectRatio;
                setSize(sizeForContentWidth(contentWidth, contentAspectRatio));
                return;
            }

            const newW = Math.max(minWidth, resizingRef.current.origW + dw);
            const newH = Math.max(MIN_MODAL_HEIGHT, resizingRef.current.origH + dh);

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

    const frame = (
        <div
            onMouseDown={centered ? (event) => event.stopPropagation() : undefined}
            style={{

                position: centered ? 'relative' : isLocked ? 'sticky' : 'fixed',
                left: isPinned ? undefined : x,
                top: centered ? undefined : isLocked ? mobileTopOffset : y,
                width: isLocked ? '100%' : w,
                maxWidth: centered ? '100%' : undefined,
                minWidth: isLocked ? undefined : minWidth,
                height: centered ? 'auto' : isLocked ? '33.333vh' : h,
                maxHeight: centered ? '100%' : undefined,
                marginBottom: isLocked ? 12 : undefined,
                zIndex: centered ? undefined : isLocked ? 1 : 1000,
                backgroundColor: UI_MODAL_SURFACE,
                border: `1px solid ${UI_BORDER_MUTED}`,
                borderRadius: 0,
                boxShadow: UI_SHADOW_ELEVATED,
                overflow: 'hidden',
                overscrollBehavior: 'contain',
                userSelect: 'none',
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box',
            }}
        >
            {/* Header Bar */}
            <div
                onMouseDown={isPinned ? undefined : handleDragStart}
                style={{
                    height: HEADER_HEIGHT,
                    flex: `0 0 ${HEADER_HEIGHT}px`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 24px',
                    backgroundColor: UI_MODAL_SURFACE,
                    borderBottom: `1px solid ${UI_BORDER_DIM}`,
                    cursor: isPinned ? 'default' : 'move',
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
                    flex: '1 1 auto',
                    minHeight: 0,
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
                        boxSizing: 'border-box',
                        flex: '0 0 auto',
                        flexWrap: footerWrap ? 'wrap' : 'nowrap',
                        overflow: 'auto',
                        minWidth: 0,
                    }}
                >
                    {footer}
                </div>
            ) : null}

            {/* Resize Handle */}
            {!isPinned && (
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

    if (!centered) {
        return frame;
    }

    // Portalled to the body: an ancestor stacking context (the sticky page header)
    // would otherwise keep the backdrop below the floating viewers.
    return createPortal(
        <div
            onMouseDown={onClose}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 1100,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 16,
                backgroundColor: UI_OVERLAY_BACKDROP_SOFT,
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
            }}
        >
            {frame}
        </div>,
        document.body,
    );
}
