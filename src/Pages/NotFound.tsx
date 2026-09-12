/*
 * Copyright 2025-2026 Sentience Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useContext } from 'react';
import { Button, Card, Space, Typography } from 'antd';
import { ArrowLeftOutlined, HomeOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import {
    UI_ACCENT_GREEN,
    UI_ACCENT_TEXT_SHADOW,
    UI_BG_BLACK,
    UI_BORDER_MUTED,
    UI_BORDER_SOFT,
    UI_COLOR_TRANSPARENT,
    UI_ERROR,
    UI_INPUT_SURFACE,
    UI_PANEL_BG,
    UI_TEXT_ON_ACCENT,
    UI_TEXT_PRIMARY_ON_DARK,
    UI_TEXT_SUBTLE,
} from '../Constants/uiTheme.ts';
import { HeaderHeightContext } from '../contexts/HeaderHeightContext.ts';

const { Text, Title } = Typography;

export const NotFound: React.FC = () => {
    const navigate = useNavigate();
    const headerHeight = useContext(HeaderHeightContext);

    return (
        <main
            style={{
                minHeight: `calc(100dvh - ${headerHeight}px - 24px)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px 0',
                boxSizing: 'border-box',
            }}
        >
            <Card
                bordered
                style={{
                    width: 'min(100%, 560px)',
                    background: UI_PANEL_BG,
                    borderColor: UI_BORDER_MUTED,
                    boxShadow: `0 0 0 1px ${UI_BG_BLACK}, 0 12px 40px rgba(0, 0, 0, 0.45)`,
                }}
                styles={{ body: { padding: 0 } }}
            >
                <div
                    style={{
                        padding: '10px 16px',
                        borderBottom: `1px solid ${UI_BORDER_MUTED}`,
                        background: UI_INPUT_SURFACE,
                        color: UI_TEXT_SUBTLE,
                        fontFamily: 'monospace',
                        fontSize: 12,
                        letterSpacing: '0.08em',
                    }}
                >
                    <span style={{ color: UI_ACCENT_GREEN }}>LUCY</span>
                    {' / NAVIGATION'}
                    <span style={{ float: 'right', color: UI_ERROR }}>404</span>
                </div>

                <div style={{ padding: 'clamp(28px, 7vw, 52px)' }}>
                    <Text
                        style={{
                            display: 'block',
                            color: UI_ACCENT_GREEN,
                            fontFamily: 'monospace',
                            fontSize: 'clamp(72px, 18vw, 132px)',
                            fontWeight: 700,
                            lineHeight: 0.9,
                            letterSpacing: '-0.08em',
                            textShadow: UI_ACCENT_TEXT_SHADOW,
                        }}
                    >
                        404
                    </Text>

                    <Title
                        level={2}
                        style={{
                            margin: '28px 0 8px',
                            color: UI_TEXT_PRIMARY_ON_DARK,
                            fontFamily: 'monospace',
                            fontSize: 'clamp(20px, 4vw, 28px)',
                        }}
                    >
                        Route not found
                    </Title>
                    <Text style={{ color: UI_TEXT_SUBTLE, fontSize: 14 }}>
                        Lucy could not locate the requested control panel route.
                    </Text>

                    <Space wrap size="middle" style={{ marginTop: 30 }}>
                        <Button
                            type="primary"
                            icon={<HomeOutlined />}
                            onClick={() => navigate('/')}
                            style={{
                                background: UI_ACCENT_GREEN,
                                borderColor: UI_ACCENT_GREEN,
                                color: UI_TEXT_ON_ACCENT,
                            }}
                        >
                            Return home
                        </Button>
                        <Button
                            icon={<ArrowLeftOutlined />}
                            onClick={() => navigate(-1)}
                            style={{
                                background: UI_COLOR_TRANSPARENT,
                                borderColor: UI_BORDER_SOFT,
                                color: UI_TEXT_PRIMARY_ON_DARK,
                            }}
                        >
                            Go back
                        </Button>
                        <Button
                            icon={<ReloadOutlined />}
                            onClick={() => window.location.reload()}
                            style={{
                                background: UI_COLOR_TRANSPARENT,
                                borderColor: UI_BORDER_SOFT,
                                color: UI_TEXT_PRIMARY_ON_DARK,
                            }}
                        >
                            Retry
                        </Button>
                    </Space>
                </div>
            </Card>
        </main>
    );
};
