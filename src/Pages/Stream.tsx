import React from 'react';
import { Page } from '../Components/Page';
import { Space, Typography } from "antd";
import { StreamPlayer } from '../Components/StreamPlayer';

const Text = Typography;

export const Stream: React.FC = () => {
    const headerContent = (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div>
                <Space align="center">
                    <Text
                        style={{
                            margin: 0,
                            color: '#00ff41',
                            fontFamily: 'monospace',
                            textShadow: '0 0 10px #00ff41',
                            fontSize: '18px',
                            fontWeight: 'bold',
                        }}
                    >
                        ▲ LUCY CONTROL PANEL
                    </Text>
                </Space>
            </div>
        </div>
    );

    return (
        <Page
            showHeader
            headerContent={headerContent}
            contentStyle={{ padding: 12, position: 'relative' }}
            removeScrollbars={false}
        >
            <StreamPlayer />
        </Page>
    );
};
