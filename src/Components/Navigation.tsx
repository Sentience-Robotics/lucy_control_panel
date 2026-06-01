import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button, Space } from 'antd';
import { ControlOutlined, SettingOutlined } from '@ant-design/icons';
import {
    UI_ACCENT_GREEN,
    UI_BORDER_MUTED,
    UI_BORDER_SOFT,
    UI_COLOR_TRANSPARENT,
    UI_NAV_BAR_BG,
    UI_TEXT_ON_ACCENT,
    UI_TEXT_PRIMARY_ON_DARK,
} from '../Constants/uiTheme.ts';

const navigationItems = [
    { to: '/', label: 'CONTROL', icon: <ControlOutlined /> },
    { to: '/configuration', label: 'CONFIGURATION', icon: <SettingOutlined /> },
];

export const Navigation: React.FC = () => {
    const location = useLocation();

    return (
        <div
            style={{
                position: 'fixed',
                bottom: 16,
                right: 16,
                zIndex: 1000,
                backgroundColor: UI_NAV_BAR_BG,
                padding: '8px',
                border: `1px solid ${UI_BORDER_MUTED}`,
                borderRadius: '0'
                }}
        >
            <Space>
                {navigationItems.map(item => (
                    <Link to={item.to} key={item.to}>
                        <Button
                            type={location.pathname === item.to ? 'primary' : 'default'}
                            icon={item.icon}
                            style={{
                                backgroundColor:
                                    location.pathname === item.to ? UI_ACCENT_GREEN : UI_COLOR_TRANSPARENT,
                                borderColor: location.pathname === item.to ? UI_ACCENT_GREEN : UI_BORDER_SOFT,
                                color: location.pathname === item.to ? UI_TEXT_ON_ACCENT : UI_TEXT_PRIMARY_ON_DARK,
                                fontWeight: 'bold',
                                fontSize: '11px'
                            }}
                        >
                            {item.label}
                        </Button>
                    </Link>
                ))}
            </Space>
        </div>
    );
};