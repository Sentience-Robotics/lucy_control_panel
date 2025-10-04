import React from 'react';
import { Page } from '../Components/Page';
import { Space, Typography } from "antd";

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
            <div style={{ width: '100%', height: '70vh', border: '1px solid #333', position: 'relative' }}>
                <iframe
                    src="http://100.64.0.11:8080/"
                    style={{ width: '100%', height: '100%', border: 'none' }}
                    allow="autoplay"
                    title="Stream"
                />
            </div>
        </Page>
    );
};
