import { useState } from 'react';
import { StreamPlayer } from "./StreamPlayer.tsx";
import { StreamMetrics } from "./StreamMetrics.tsx";
import { MovableModal } from './MovableModal.tsx';

interface StreamPlayerModalProps {
    isVisible: boolean;
    onClose: () => void;
    initialPosition?: { x: number; y: number };
    initialSize?: { w: number; h: number };
    aspectRatio?: number;
}

export function StreamPlayerModal({
    isVisible,
    onClose,
    initialPosition = { x: 100, y: 100 },
    initialSize = { w: 480, h: 320 },
    aspectRatio = 4.5 / 3
}: StreamPlayerModalProps) {
    const [frameDelay, setFrameDelay] = useState<number>(0);
    const [fps, setFps] = useState<number>(0);

    return (
        <MovableModal
            modalName="STREAM"
            header={<StreamMetrics fps={fps} frameDelay={frameDelay} />}
            isVisible={isVisible}
            onClose={onClose}
            initialPosition={initialPosition}
            initialSize={initialSize}
            aspectRatio={aspectRatio}
        >
            <StreamPlayer onFrameDelayChange={setFrameDelay} onFpsChange={setFps} />
        </MovableModal>
    );
}
