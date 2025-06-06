import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button, Space } from 'antd';
import { EyeOutlined, ControlOutlined } from '@ant-design/icons';

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
                <Link to="/">
                    <Button
                        type={location.pathname === '/' ? 'primary' : 'default'}
                        icon={<ControlOutlined />}
                        style={{
                            backgroundColor: location.pathname === '/' ? '#00ff41' : 'transparent',
                            borderColor: location.pathname === '/' ? '#00ff41' : '#444',
                            color: location.pathname === '/' ? '#000' : '#fff',
                            fontWeight: 'bold',
                            fontSize: '11px'
                        }}
                    >
                        CONTROL
                    </Button>
                </Link>
                <Link to="/3d-viewer">
                    <Button
                        type={location.pathname === '/3d-viewer' ? 'primary' : 'default'}
                        icon={<EyeOutlined />}
                        style={{
                            backgroundColor: location.pathname === '/3d-viewer' ? '#00ff41' : 'transparent',
                            borderColor: location.pathname === '/3d-viewer' ? '#00ff41' : '#444',
                            color: location.pathname === '/3d-viewer' ? '#000' : '#fff',
                            fontWeight: 'bold',
                            fontSize: '11px'
                        }}
                    >
                        3D VIEW
                    </Button>
                </Link>
            </Space>
        </div>
    );
};