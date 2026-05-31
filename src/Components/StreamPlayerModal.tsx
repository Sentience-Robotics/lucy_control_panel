import { useState, useMemo, useRef } from 'react';
import { Select, Button, Tooltip } from 'antd';
import { FullscreenOutlined, FullscreenExitOutlined } from '@ant-design/icons';
import { StreamPlayer } from "./StreamPlayer.tsx";
import { StreamMetrics } from "./StreamMetrics.tsx";
import { MovableModal } from './MovableModal.tsx';
import Robot3DViewer from '../Pages/Robot3DViewer.tsx';
import { useAvailableTopics } from '../hooks/useAvailableTopics.ts';
import { STREAM_SOURCES, DEFAULT_STREAM_SOURCE } from '../Constants/rosConfig';
import type { StreamSource } from '../Constants/rosConfig';
import {
    UI_WARNING,
    UI_BORDER_MUTED,
    UI_CHROME_SURFACE,
    UI_INPUT_SURFACE,
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

/** Real (non-virtual) stream topics whose publishers we probe for availability. */
const CAMERA_TOPICS = STREAM_SOURCES.filter(s => !s.virtual).map(s => s.topic);

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
    const [selectedStreamSource, setSelectedStreamSource] = useState<StreamSource>(DEFAULT_STREAM_SOURCE);
    const [hasEmptyDataWarning, setHasEmptyDataWarning] = useState<boolean>(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Camera topics with a live publisher (null = unknown → assume available).
    const availableTopics = useAvailableTopics(CAMERA_TOPICS, isVisible);

    // Selectable if virtual, has a publisher, or availability is still unknown.
    const isSourceAvailable = (source: StreamSource): boolean =>
        source.virtual === true || availableTopics === null || availableTopics.has(source.topic);

    const handleStreamSourceChange = (value: string) => {
        const source = STREAM_SOURCES.find(s => s.id === value);
        if (source) {
            setSelectedStreamSource(source);
            setHasEmptyDataWarning(false);
        }
    };

    // What we render: the user's pick if available, else the first available
    // source (3D View is virtual, so there's always a fallback). The pick is
    // kept and restored if its publisher comes back.
    const activeSource = isSourceAvailable(selectedStreamSource)
        ? selectedStreamSource
        : STREAM_SOURCES.find(isSourceAvailable) ?? selectedStreamSource;

    const handleFullscreenToggle = () => {
        const container = containerRef.current;
        if (!container) return;

        if (!document.fullscreenElement) {
            container.requestFullscreen().then(() => setIsFullscreen(true)).catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            document.exitFullscreen().then(() => setIsFullscreen(false)).catch(err => {
                console.error(`Error attempting to disable fullscreen: ${err.message}`);
            });
        }
    };

    const selectOptions = useMemo(() =>
        STREAM_SOURCES.map(source => {
            const available = isSourceAvailable(source);
            return {
                value: source.id,
                label: available ? source.name : `${source.name} (unavailable)`,
                disabled: !available,
            };
        }),
        [availableTopics]
    );

    const is3DView = activeSource.virtual === true;

    // Track fullscreen change event in case user exits with Esc
    useMemo(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    return (
        <MovableModal
            modalName="STREAM"
            header={
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Tooltip title="Select the video stream or 3D model to display">
                        <Select
                            size="small"
                            value={activeSource.id}
                            onChange={handleStreamSourceChange}
                            style={{ width: 150 }}
                            options={selectOptions}
                            popupMatchSelectWidth={false}
                            styles={SELECT_POPUP_STYLE}
                        />
                    </Tooltip>
                    {!is3DView && <StreamMetrics fps={fps} frameDelay={frameDelay} />}
                    {hasEmptyDataWarning && (
                        <span
                            style={WARNING_BADGE_STYLE}
                            title="Topic is not publishing compressed image data. Check ROS configuration."
                        >
                            ⚠️ NO DATA
                        </span>
                    )}
                    <Button
                        size="small"
                        type="text"
                        icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                        onClick={handleFullscreenToggle}
                        title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                    />
                </div>
            }
            isVisible={isVisible}
            onClose={onClose}
            initialPosition={initialPosition}
            initialSize={initialSize}
            aspectRatio={aspectRatio}
        >
            <div ref={containerRef} style={{ width: '100%', height: '100%', backgroundColor: 'black' }}>
                {is3DView ? (
                    <Robot3DViewer />
                ) : (
                    <StreamPlayer
                        onFrameDelayChange={setFrameDelay}
                        onFpsChange={setFps}
                        streamSource={activeSource}
                        onEmptyDataWarning={setHasEmptyDataWarning}
                    />
                )}
            </div>
        </MovableModal>
    );
}
