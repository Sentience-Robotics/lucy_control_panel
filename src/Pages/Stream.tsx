import React, { useState, useMemo } from 'react';
import { Space, Typography, Select } from "antd";
import { Page } from '../Components/Page';
import { StreamPlayer } from '../Components/StreamPlayer';
import { StreamMetrics } from '../Components/StreamMetrics';
import type { StreamSource } from '../Constants/rosConfig';
import { STREAM_SOURCES, DEFAULT_STREAM_SOURCE } from '../Constants/rosConfig';
import {
    UI_ACCENT_GREEN,
    UI_WARNING,
    UI_ACCENT_TEXT_SHADOW,
    UI_BORDER_MUTED,
    UI_CHROME_SURFACE,
    UI_INPUT_SURFACE,
} from '../Constants/uiTheme.ts';

const Text = Typography;

const SELECT_POPUP_STYLE = {
    popup: {
        root: {
            backgroundColor: UI_CHROME_SURFACE,
            borderColor: UI_BORDER_MUTED,
        }
    }
};

const WARNING_BADGE_STYLE: React.CSSProperties = {
    color: UI_WARNING,
    fontFamily: 'monospace',
    fontSize: 10,
    padding: '2px 6px',
    backgroundColor: UI_INPUT_SURFACE,
    border: `1px solid ${UI_WARNING}`,
    borderRadius: 4
};

export const Stream: React.FC = () => {
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

    const headerContent = (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div>
                <Space align="center">
                    <Text
                        style={{
                            margin: 0,
                            color: UI_ACCENT_GREEN,
                            fontFamily: 'monospace',
                            textShadow: UI_ACCENT_TEXT_SHADOW,
                            fontSize: '18px',
                            fontWeight: 'bold',
                        }}
                    >
                        ▲ LUCY CONTROL PANEL
                    </Text>
                </Space>
            </div>
            <Space align="center" size="middle">
                <Select
                    size="small"
                    value={selectedStreamSource.id}
                    onChange={handleStreamSourceChange}
                    style={{ width: 200 }}
                    options={selectOptions}
                    popupMatchSelectWidth={false}
                    styles={SELECT_POPUP_STYLE}
                />
                <StreamMetrics fps={fps} frameDelay={frameDelay} fontSize={12} />
                {hasEmptyDataWarning && (
                    <span
                        style={WARNING_BADGE_STYLE}
                        title="Topic is not publishing compressed image data. Check ROS configuration."
                    >
                        ⚠️ NO DATA
                    </span>
                )}
            </Space>
        </div>
    );

    return (
        <Page
            showHeader
            headerContent={headerContent}
            contentStyle={{ padding: 12, position: 'relative' }}
            removeScrollbars={false}
        >
            <StreamPlayer
                onFrameDelayChange={setFrameDelay}
                onFpsChange={setFps}
                streamSource={selectedStreamSource}
                onEmptyDataWarning={setHasEmptyDataWarning}
            />
        </Page>
    );
};
