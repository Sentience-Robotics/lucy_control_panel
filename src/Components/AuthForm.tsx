import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Alert } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import CryptoJS from 'crypto-js';
import {
    UI_ACCENT_GREEN,
    UI_ACCENT_TEXT_SHADOW,
    UI_AUTH_ALERT_SURFACE,
    UI_BORDER_DIM,
    UI_BORDER_MUTED,
    UI_CHROME_SURFACE,
    UI_ERROR_RED,
    UI_GRADIENT_AUTH_PAGE,
    UI_PANEL_BG,
    UI_TEXT_ON_ACCENT,
    UI_TEXT_PRIMARY_ON_DARK,
    UI_TEXT_SECONDARY_MUTED,
    UI_TEXT_SUBTLE,
    uiAccentRgba,
} from '../Constants/uiTheme.ts';

const { Title, Text } = Typography;

interface AuthFormProps {
    onLogin: (username: string) => void;
    error?: string;
}

export const AuthForm: React.FC<AuthFormProps> = ({ onLogin, error }) => {
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();

    const handleSubmit = async (values: { username: string; password: string }) => {
        setLoading(true);
        
        try {
            const expectedPassword = import.meta.env.VITE_LOCAL_PASSWORD;
            const expectedUsername = import.meta.env.VITE_LOCAL_USERNAME;
            
            if (!expectedPassword || !expectedUsername) {
                throw new Error('Authentication not configured');
            }

            if (values.username.toLowerCase() !== expectedUsername.toLowerCase()) {
                throw new Error('Invalid username');
            }

            const hashedPassword = CryptoJS.MD5(values.password).toString();

            if (hashedPassword === expectedPassword) {
                onLogin(values.username);
            } else {
                throw new Error('Invalid password');
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
            form.setFields([
                {
                    name: 'username',
                    errors: errorMessage.includes('username') ? [errorMessage] : []
                },
                {
                    name: 'password',
                    errors: errorMessage.includes('password') || errorMessage.includes('credentials') ? [errorMessage] : []
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            background: UI_GRADIENT_AUTH_PAGE,
            padding: '20px'
        }}>
            <Card
                style={{
                    width: '100%',
                    maxWidth: 400,
                    backgroundColor: UI_PANEL_BG,
                    border: `1px solid ${UI_BORDER_MUTED}`,
                    borderRadius: 12,
                    boxShadow: `0 8px 32px ${uiAccentRgba(0.1)}`
                }}
                bodyStyle={{ padding: '40px 32px' }}
            >
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <Title 
                        level={2} 
                        style={{ 
                            color: UI_ACCENT_GREEN,
                            fontFamily: 'monospace',
                            textShadow: UI_ACCENT_TEXT_SHADOW,
                            margin: 0
                        }}
                    >
                        ▲ LUCY CONTROL PANEL
                    </Title>
                    <Text style={{ color: UI_TEXT_SUBTLE, fontFamily: 'monospace', fontSize: 14 }}>
                        Authentication Required
                    </Text>
                </div>

                {error && (
                    <Alert
                        message={error}
                        type="error"
                        style={{ marginBottom: 24, backgroundColor: UI_AUTH_ALERT_SURFACE, borderColor: UI_ERROR_RED }}
                    />
                )}

                <Form
                    form={form}
                    name="login"
                    onFinish={handleSubmit}
                    layout="vertical"
                    size="large"
                >
                    <Form.Item
                        name="username"
                        rules={[
                            { required: true, message: 'Please enter your username!' },
                            { min: 3, message: 'Username must be at least 3 characters!' }
                        ]}
                    >
                        <Input
                            prefix={<UserOutlined style={{ color: UI_ACCENT_GREEN }} />}
                            placeholder="Username"
                            style={{
                                backgroundColor: UI_CHROME_SURFACE,
                                borderColor: UI_BORDER_MUTED,
                                color: UI_TEXT_PRIMARY_ON_DARK,
                                fontFamily: 'monospace'
                            }}
                        />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        rules={[
                            { required: true, message: 'Please enter your password!' },
                            { min: 6, message: 'Password must be at least 6 characters!' }
                        ]}
                    >
                        <Input.Password
                            prefix={<LockOutlined style={{ color: UI_ACCENT_GREEN }} />}
                            placeholder="Password"
                            style={{
                                backgroundColor: UI_CHROME_SURFACE,
                                borderColor: UI_BORDER_MUTED,
                                color: UI_TEXT_PRIMARY_ON_DARK,
                                fontFamily: 'monospace'
                            }}
                        />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0 }}>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={loading}
                            block
                            style={{
                                height: 48,
                                backgroundColor: UI_ACCENT_GREEN,
                                borderColor: UI_ACCENT_GREEN,
                                color: UI_TEXT_ON_ACCENT,
                                fontFamily: 'monospace',
                                fontSize: 16,
                                fontWeight: 'bold',
                                boxShadow: `0 0 20px ${uiAccentRgba(0.3)}`,
                                transition: 'all 0.3s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.boxShadow = `0 0 30px ${uiAccentRgba(0.5)}`;
                                e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.boxShadow = `0 0 20px ${uiAccentRgba(0.3)}`;
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            {loading ? 'AUTHENTICATING...' : 'LOGIN'}
                        </Button>
                    </Form.Item>
                </Form>

                <div style={{ 
                    textAlign: 'center', 
                    marginTop: 24,
                    padding: '16px',
                    backgroundColor: UI_CHROME_SURFACE,
                    borderRadius: 8,
                    border: `1px solid ${UI_BORDER_DIM}`
                }}>
                    <Text style={{ color: UI_TEXT_SECONDARY_MUTED, fontFamily: 'monospace', fontSize: 12 }}>
                        Secure access to Lucy's control systems
                    </Text>
                </div>
            </Card>
        </div>
    );
};
