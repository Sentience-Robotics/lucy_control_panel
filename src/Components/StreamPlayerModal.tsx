import { useState, useMemo } from 'react';
import { Select } from 'antd';
import { StreamPlayer } from "./StreamPlayer.tsx";
import { StreamMetrics } from "./StreamMetrics.tsx";
import { MovableModal } from './MovableModal.tsx';
import { STREAM_SOURCES, DEFAULT_STREAM_SOURCE } from '../Constants/rosConfig';
import type { StreamSource } from '../Constants/rosConfig';
import {
    UI_ACCENT_ORANGE,
    UI_BORDER_MUTED,
    UI_CHROME_SURFACE,
    UI_INPUT_SURFACE,
} from '../Constants/uiTheme.ts';

const WARNING_BADGE_STYLE: React.CSSProperties = {
    color: UI_ACCENT_ORANGE,
    fontFamily: 'monospace',
    fontSize: 10,
    padding: '2px 6px',
    backgroundColor: UI_INPUT_SURFACE,
    border: `1px solid ${UI_ACCENT_ORANGE}`,
    borderRadius: 4
};

const SELECT_POPUP_STYLE = {
    popup: {
        root: {
            backgroundColor: UI_CHROME_SURFACE,
            borderColor: UI_BORDER_MUTED,
        }
    }
};

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
    const [selectedStreamSource, setSelectedStreamSource] = useState<StreamSource>(DEFAULT_STREAM_SOURCE);
    const [hasEmptyDataWarning, setHasEmptyDataWarning] = useState<boolean>(false);

    const handleStreamSourceChange = (value: string) => {
        const source = STREAM_SOURCES.find(s => s.id === value);
        if (source) {
            setSelectedStreamSource(source);
            setHasEmptyDataWarning(false); // Reset warning when switching
        }
    };

    const selectOptions = useMemo(() => 
        STREAM_SOURCES.map(source => ({
            value: source.id,
            label: source.name
        })), 
        []
    );

    return (
        <MovableModal
            modalName="STREAM"
            header={
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Select
                        size="small"
                        value={selectedStreamSource.id}
                        onChange={handleStreamSourceChange}
                        style={{ width: 150 }}
                        options={selectOptions}
                        popupMatchSelectWidth={false}
                        styles={SELECT_POPUP_STYLE}
                    />
                    <StreamMetrics fps={fps} frameDelay={frameDelay} />
                    {hasEmptyDataWarning && (
                        <span 
                            style={WARNING_BADGE_STYLE}
                            title="Topic is not publishing compressed image data. Check ROS configuration."
                        >
                            ⚠️ NO DATA
                        </span>
                    )}
                </div>
            }
            isVisible={isVisible}
            onClose={onClose}
            initialPosition={initialPosition}
            initialSize={initialSize}
            aspectRatio={aspectRatio}
        >
            <StreamPlayer 
                onFrameDelayChange={setFrameDelay} 
                onFpsChange={setFps}
                streamSource={selectedStreamSource}
                onEmptyDataWarning={setHasEmptyDataWarning}
            />
        </MovableModal>
    );
}
