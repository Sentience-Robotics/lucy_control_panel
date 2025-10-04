import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Alert } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import CryptoJS from 'crypto-js';

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
            // Get the expected credentials from environment variables
            const expectedPassword = import.meta.env.VITE_LOCAL_PASSWORD;
            const expectedUsername = import.meta.env.VITE_LOCAL_USERNAME;
            
            if (!expectedPassword || !expectedUsername) {
                throw new Error('Authentication not configured');
            }

            // Validate username
            if (values.username.toLowerCase() !== expectedUsername.toLowerCase()) {
                throw new Error('Invalid username');
            }

            // Hash the entered password with MD5
            const hashedPassword = CryptoJS.MD5(values.password).toString();
            
            // Compare with the expected password (which should also be MD5 hashed)
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
            background: 'linear-gradient(135deg, #000000 0%, #0a0a0a 100%)',
            padding: '20px'
        }}>
            <Card
                style={{
                    width: '100%',
                    maxWidth: 400,
                    backgroundColor: '#0a0a0a',
                    border: '1px solid #333',
                    borderRadius: 12,
                    boxShadow: '0 8px 32px rgba(0, 255, 65, 0.1)'
                }}
                bodyStyle={{ padding: '40px 32px' }}
            >
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <Title 
                        level={2} 
                        style={{ 
                            color: '#00ff41', 
                            fontFamily: 'monospace',
                            textShadow: '0 0 10px #00ff41',
                            margin: 0
                        }}
                    >
                        ▲ LUCY CONTROL PANEL
                    </Title>
                    <Text style={{ color: '#888', fontFamily: 'monospace', fontSize: 14 }}>
                        Authentication Required
                    </Text>
                </div>

                {error && (
                    <Alert
                        message={error}
                        type="error"
                        style={{ marginBottom: 24, backgroundColor: '#1a0a0a', borderColor: '#ff4d4f' }}
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
                            prefix={<UserOutlined style={{ color: '#00ff41' }} />}
                            placeholder="Username"
                            style={{
                                backgroundColor: '#0d0d0d',
                                borderColor: '#333',
                                color: '#fff',
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
                            prefix={<LockOutlined style={{ color: '#00ff41' }} />}
                            placeholder="Password"
                            style={{
                                backgroundColor: '#0d0d0d',
                                borderColor: '#333',
                                color: '#fff',
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
                                backgroundColor: '#00ff41',
                                borderColor: '#00ff41',
                                color: '#000',
                                fontFamily: 'monospace',
                                fontSize: 16,
                                fontWeight: 'bold',
                                boxShadow: '0 0 20px rgba(0, 255, 65, 0.3)',
                                transition: 'all 0.3s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 255, 65, 0.5)';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 255, 65, 0.3)';
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
                    backgroundColor: '#0d0d0d',
                    borderRadius: 8,
                    border: '1px solid #222'
                }}>
                    <Text style={{ color: '#666', fontFamily: 'monospace', fontSize: 12 }}>
                        Secure access to Lucy's control systems
                    </Text>
                </div>
            </Card>
        </div>
    );
};
