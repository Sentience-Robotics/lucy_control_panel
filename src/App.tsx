import { ConfigProvider, theme, Spin } from 'antd';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState, useEffect, lazy, Suspense } from 'react';
/* Pages */
import { RobotControlPanel } from './Pages/RobotControlPanel';
import { Stream } from "./Pages/Stream.tsx";
import { Navigation } from './Components/Navigation';
import { NotFound } from './Pages/NotFound';
import { ActiveHardwareRosProvider } from './contexts/ActiveHardwareRosContext';
/* Components */
import { AuthForm } from './Components/AuthForm';
import {
    UI_ACCENT_GREEN,
    UI_BG_BLACK,
    UI_BORDER_STRONG,
    UI_COLOR_TRANSPARENT,
    UI_PANEL_BG,
    UI_TEXT_PRIMARY_ON_DARK,
    UI_TEXT_SUBTLE,
} from './Constants/uiTheme.ts';

const Robot3DViewer = lazy(() => import('./Pages/Robot3DViewer').then(module => ({ default: module.default })));
const Configuration = lazy(() => import('./Pages/Configuration').then(module => ({ default: module.default })));

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
                        colorPrimary: UI_ACCENT_GREEN,
                        colorBgBase: UI_BG_BLACK,
                        colorBgContainer: UI_PANEL_BG,
                        colorBorder: UI_BORDER_STRONG,
                        colorText: UI_TEXT_PRIMARY_ON_DARK,
                        colorTextSecondary: UI_TEXT_SUBTLE,
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
                    colorPrimary: UI_ACCENT_GREEN,
                    colorBgBase: UI_BG_BLACK,
                    colorBgContainer: UI_PANEL_BG,
                    colorBorder: UI_BORDER_STRONG,
                    colorText: UI_TEXT_PRIMARY_ON_DARK,
                    colorTextSecondary: UI_TEXT_SUBTLE,
                    fontFamily: '"JetBrains Mono", "Fira Code", "Monaco", "Consolas", monospace',
                },
                components: {
                    Layout: {
                        bodyBg: UI_BG_BLACK,
                        headerBg: UI_PANEL_BG,
                    },
                    Card: {
                        colorBgContainer: UI_PANEL_BG,
                    },
                    Button: {
                        colorBgContainer: UI_COLOR_TRANSPARENT,
                    },
                },
            }}
        >
            <Router>
                <ActiveHardwareRosProvider>
                <Navigation />
                <Routes>
                    <Route path="/" element={<RobotControlPanel />} />
                    <Route path="/3d-viewer" element={
                        <Suspense fallback={<Spin size="large" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }} />}>
                            <Robot3DViewer />
                        </Suspense>
                    } />
                    <Route path="/configuration" element={
                        <Suspense fallback={<Spin size="large" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }} />}>
                            <Configuration />
                        </Suspense>
                    } />
                    <Route path="/stream" element={<Stream />} />
                    <Route path="*" element={<NotFound />} />
                </Routes>
                </ActiveHardwareRosProvider>
            </Router>
        </ConfigProvider>
    );
}

export default App;
