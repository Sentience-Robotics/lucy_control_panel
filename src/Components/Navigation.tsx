import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button, Space, Grid } from 'antd';
import { ControlOutlined, SettingOutlined, FundProjectionScreenOutlined } from '@ant-design/icons';
import { ROUTES } from '../Constants/routes.ts';
import {
    UI_ACCENT_GREEN,
    UI_BORDER_MUTED,
    UI_BORDER_SOFT,
    UI_COLOR_TRANSPARENT,
    UI_NAV_BAR_BG,
    UI_TEXT_ON_ACCENT,
    UI_TEXT_PRIMARY_ON_DARK,
} from '../Constants/uiTheme.ts';

const { useBreakpoint } = Grid;

const navigationItems = [
    { to: ROUTES.control, label: 'CONTROL', icon: <ControlOutlined /> },
    { to: ROUTES.sensors, label: 'SENSORS', icon: <FundProjectionScreenOutlined /> },
    { to: ROUTES.robotConfiguration, label: 'ROBOT CONFIGURATION', icon: <SettingOutlined /> },
];

export const Navigation: React.FC = () => {
    const location = useLocation();
    const screens = useBreakpoint();
    const isMobile = !screens.md;

    const desktopStyle: React.CSSProperties = {
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: 1000,
        backgroundColor: UI_NAV_BAR_BG,
        padding: '8px',
        border: `1px solid ${UI_BORDER_MUTED}`,
        borderRadius: '0'
    };

    const mobileStyle: React.CSSProperties = {
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        backgroundColor: UI_NAV_BAR_BG,
        borderTop: `1px solid ${UI_BORDER_MUTED}`,
        display: 'flex',
        justifyContent: 'space-around',
        padding: '8px 0',
    };

    const buttonStyle = (isActive: boolean): React.CSSProperties => ({
        backgroundColor: isActive ? UI_ACCENT_GREEN : UI_COLOR_TRANSPARENT,
        borderColor: isActive ? UI_ACCENT_GREEN : UI_BORDER_SOFT,
        color: isActive ? UI_TEXT_ON_ACCENT : UI_TEXT_PRIMARY_ON_DARK,
        fontWeight: 'bold',
        fontSize: '11px'
    });

    if (isMobile) {
        return (
            <div style={mobileStyle}>
                {navigationItems.map(item => (
                    <Link to={item.to} key={item.to} style={{ flex: 1, textAlign: 'center' }}>
                        <Button
                            type={location.pathname === item.to ? 'primary' : 'default'}
                            icon={item.icon}
                            style={buttonStyle(location.pathname === item.to)}
                        >
                            {screens.sm && item.label}
                        </Button>
                    </Link>
                ))}
            </div>
        );
    }

    return (
        <div style={desktopStyle}>
            <Space>
                {navigationItems.map(item => (
                    <Link to={item.to} key={item.to}>
                        <Button
                            type={location.pathname === item.to ? 'primary' : 'default'}
                            icon={item.icon}
                            style={buttonStyle(location.pathname === item.to)}
                        >
                            {item.label}
                        </Button>
                    </Link>
                ))}
            </Space>
        </div>
    );
};
