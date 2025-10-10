import { ConfigProvider, theme } from 'antd';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
/* Pages */
import { RobotControlPanel } from './Pages/RobotControlPanel';
import { Robot3DViewer } from './Pages/Robot3DViewer';
import { Stream } from "./Pages/Stream.tsx";
import { Navigation } from './Components/Navigation';
import { NotFound } from './Pages/NotFound';
/* Components */
import { AuthForm } from './Components/AuthForm';

function App() {
    const localPassword: string | undefined = import.meta.env.VITE_LOCAL_PASSWORD;
    const localUsername: string | undefined = import.meta.env.VITE_LOCAL_USERNAME;
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [authError, setAuthError] = useState<string>('');

    useEffect(() => {
        const savedAuth = localStorage.getItem('lucy_auth');
        if (savedAuth) {
            try {
                const { timestamp } = JSON.parse(savedAuth);

                const now = Date.now();
                const authTime = new Date(timestamp).getTime();
                if (now - authTime < 60 * 60 * 1000) { // 1 hour validity
                    setIsAuthenticated(true);
                } else {
                    localStorage.removeItem('lucy_auth');
                }
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (error) {
                localStorage.removeItem('lucy_auth');
            }
        }
    }, []);

    const handleLogin = (user: string) => {
        setIsAuthenticated(true);
        setAuthError('');
        localStorage.setItem('lucy_auth', JSON.stringify({
            username: user,
            timestamp: new Date().toISOString()
        }));
    };

    if (localPassword && localUsername && !isAuthenticated) {
        return (
            <ConfigProvider
                theme={{
                    algorithm: theme.darkAlgorithm,
                    token: {
                        colorPrimary: '#00ff41',
                        colorBgBase: '#000000',
                        colorBgContainer: '#0a0a0a',
                        colorBorder: '#333333',
                        colorText: '#ffffff',
                        colorTextSecondary: '#888888',
                        fontFamily: '"JetBrains Mono", "Fira Code", "Monaco", "Consolas", monospace',
                    },
                }}
            >
                <AuthForm onLogin={handleLogin} error={authError} />
            </ConfigProvider>
        );
    }

    return (
        <ConfigProvider
            theme={{
                algorithm: theme.darkAlgorithm,
                token: {
                    colorPrimary: '#00ff41',
                    colorBgBase: '#000000',
                    colorBgContainer: '#0a0a0a',
                    colorBorder: '#333333',
                    colorText: '#ffffff',
                    colorTextSecondary: '#888888',
                    fontFamily: '"JetBrains Mono", "Fira Code", "Monaco", "Consolas", monospace',
                },
                components: {
                    Layout: {
                        bodyBg: '#000000',
                        headerBg: '#0a0a0a',
                    },
                    Card: {
                        colorBgContainer: '#0a0a0a',
                    },
                    Button: {
                        colorBgContainer: 'transparent',
                    },
                },
            }}
        >
            <Router>
                <Navigation />
                <Routes>
                    <Route path="/" element={<RobotControlPanel />} />
                    <Route path="/3d-viewer" element={<Robot3DViewer />} />
                    <Route path="/stream" element={<Stream />} />
                    <Route path="*" element={<NotFound />} />
                </Routes>
            </Router>
        </ConfigProvider>
    );
}

export default App;
