import { useContext, type ReactNode } from 'react';
import { Button } from 'antd';
import { FullscreenOutlined, FullscreenExitOutlined } from '@ant-design/icons';
import { MovableModal } from './MovableModal.tsx';
import { HeaderHeightContext } from '../contexts/HeaderHeightContext.ts';
import { useFullscreen } from '../hooks/useFullscreen.ts';

interface FloatingViewerModalProps {
    modalName: string;
    headerExtra?: ReactNode;
    isVisible: boolean;
    onClose: () => void;
    initialPosition?: { x: number; y: number };
    initialSize?: { w: number; h: number };
    aspectRatio?: number;
    children: ReactNode;
}

/**
 * Shared chrome for the floating viewer windows: draggable modal, fullscreen
 * toggle, and a black content box the viewer fills. Each viewer supplies its
 * own header controls and body.
 */
export function FloatingViewerModal({
    modalName,
    headerExtra,
    isVisible,
    onClose,
    initialPosition = { x: 100, y: 100 },
    initialSize = { w: 480, h: 320 },
    aspectRatio = 4.5 / 3,
    children,
}: FloatingViewerModalProps) {
    const headerHeight = useContext(HeaderHeightContext);
    const { ref, isFullscreen, toggle } = useFullscreen<HTMLDivElement>();

    return (
        <MovableModal
            modalName={modalName}
            header={
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {headerExtra}
                    <Button
                        size="small"
                        type="text"
                        icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                        onClick={toggle}
                        title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                    />
                </div>
            }
            isVisible={isVisible}
            onClose={onClose}
            initialPosition={initialPosition}
            initialSize={initialSize}
            aspectRatio={aspectRatio}
            mobileFixedTop
            mobileTopOffset={headerHeight}
        >
            <div ref={ref} style={{ width: '100%', height: '100%', backgroundColor: 'black' }}>
                {children}
            </div>
        </MovableModal>
    );
}
