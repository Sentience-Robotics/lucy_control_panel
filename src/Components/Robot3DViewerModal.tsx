/*
 * Copyright 2025-2026 Sentience Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { FloatingViewerModal } from './FloatingViewerModal.tsx';
import Robot3DViewer from '../Pages/Robot3DViewer.tsx';

interface Robot3DViewerModalProps {
    isVisible: boolean;
    onClose: () => void;
    initialPosition?: { x: number; y: number };
    initialSize?: { w: number; h: number };
}

/** Floating window for the URDF viewer — no source picker, no stream metrics. */
export function Robot3DViewerModal({
    isVisible,
    onClose,
    initialPosition = { x: 100, y: 100 },
    initialSize = { w: 400, h: 800 },
}: Robot3DViewerModalProps) {
    return (
        <FloatingViewerModal
            modalName="3D VIEW"
            isVisible={isVisible}
            onClose={onClose}
            initialPosition={initialPosition}
            initialSize={initialSize}
        >
            <Robot3DViewer />
        </FloatingViewerModal>
    );
}
