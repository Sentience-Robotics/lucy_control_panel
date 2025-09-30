import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button, Space } from 'antd';
import { EyeOutlined, ControlOutlined, CameraOutlined } from '@ant-design/icons';

const navigationItems = [
    { to: '/', label: 'CONTROL', icon: <ControlOutlined /> },
    { to: '/3d-viewer', label: '3D VIEW', icon: <EyeOutlined /> },
    { to: '/stream', label: 'STREAM', icon: <CameraOutlined /> }
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
                backgroundColor: 'rgba(10, 10, 10, 0.9)',
                padding: '8px',
                border: '1px solid #333',
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
                                backgroundColor: location.pathname === item.to ? '#00ff41' : 'transparent',
                                borderColor: location.pathname === item.to ? '#00ff41' : '#444',
                                color: location.pathname === item.to ? '#000' : '#fff',
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