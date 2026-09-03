import { useCallback, useMemo, useState } from 'react';
import { Select, Tooltip } from 'antd';
import { StreamPlayer } from "./StreamPlayer.tsx";
import { StreamMetrics } from "./StreamMetrics.tsx";
import { FloatingViewerModal } from './FloatingViewerModal.tsx';
import { useLiveCameraSources } from '../hooks/useLiveCameraSources.ts';
import type { StreamSource } from '../Constants/rosConfig';
import {
    UI_WARNING,
    UI_BORDER_MUTED,
    UI_CHROME_SURFACE,
    UI_INPUT_SURFACE,
    UI_TEXT_SECONDARY_MUTED,
} from '../Constants/uiTheme.ts';

const WARNING_BADGE_STYLE: React.CSSProperties = {
    color: UI_WARNING,
    fontFamily: 'monospace',
    fontSize: 10,
    padding: '2px 6px',
    backgroundColor: UI_INPUT_SURFACE,
    border: `1px solid ${UI_WARNING}`,
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
    aspectRatio = 4.5 / 3,
}: StreamPlayerModalProps) {
    const [frameDelay, setFrameDelay] = useState<number>(0);
    const [fps, setFps] = useState<number>(0);
    const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
    const [hasEmptyDataWarning, setHasEmptyDataWarning] = useState<boolean>(false);
    const { sources, availableTopics, liveSources } = useLiveCameraSources();

    const isAvailable = useCallback(
        (source: StreamSource) => availableTopics === null || availableTopics.has(source.topic),
        [availableTopics],
    );

    const selectedSource = sources.find((s) => s.id === selectedSourceId) ?? null;
    const activeSource = selectedSource && isAvailable(selectedSource)
        ? selectedSource
        : liveSources[0] ?? selectedSource ?? sources[0] ?? null;

    const handleStreamSourceChange = (value: string) => {
        setSelectedSourceId(value);
        setHasEmptyDataWarning(false);
    };

    const selectOptions = useMemo(
        () =>
            sources.map((source) => {
                const available = isAvailable(source);
                return {
                    value: source.id,
                    label: available ? source.name : `${source.name} (unavailable)`,
                    disabled: !available,
                };
            }),
        [sources, isAvailable],
    );

    return (
        <FloatingViewerModal
            modalName="STREAM"
            headerExtra={
                <>
                    <Tooltip title="Select the camera stream to display">
                        <Select
                            size="small"
                            value={activeSource?.id ?? null}
                            placeholder="NO CAMERA"
                            onChange={handleStreamSourceChange}
                            style={{ width: 150 }}
                            options={selectOptions}
                            disabled={sources.length === 0}
                            popupMatchSelectWidth={false}
                            styles={SELECT_POPUP_STYLE}
                        />
                    </Tooltip>
                    <StreamMetrics fps={fps} frameDelay={frameDelay} />
                    {hasEmptyDataWarning && (
                        <span
                            style={WARNING_BADGE_STYLE}
                            title="Topic is not publishing compressed image data. Check ROS configuration."
                        >
                            ⚠️ NO DATA
                        </span>
                    )}
                </>
            }
            isVisible={isVisible}
            onClose={onClose}
            initialPosition={initialPosition}
            initialSize={initialSize}
            aspectRatio={aspectRatio}
        >
            {activeSource ? (
                <StreamPlayer
                    onFrameDelayChange={setFrameDelay}
                    onFpsChange={setFps}
                    streamSource={activeSource}
                    onEmptyDataWarning={setHasEmptyDataWarning}
                />
            ) : (
                <div
                    style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: UI_TEXT_SECONDARY_MUTED,
                        fontFamily: 'monospace',
                        fontSize: 12,
                        textAlign: 'center',
                        padding: 12,
                    }}
                >
                    NO CAMERA IN THE ACTIVE HARDWARE CONFIGURATION
                </div>
            )}
        </FloatingViewerModal>
    );
}
