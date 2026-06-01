import { ConfigProvider, theme, Layout, Grid } from 'antd';
import { BrowserRouter as Router, useLocation } from 'react-router-dom';
import { useState, useEffect, lazy, Suspense } from 'react';
import type { CSSProperties, FC } from 'react';
/* Pages */
import { RobotControlPanel } from './Pages/RobotControlPanel';
import { Navigation } from './Components/Navigation';
import { NotFound } from './Pages/NotFound';
import { ActiveHardwareRosProvider } from './contexts/ActiveHardwareRosContext';
/* Components */
import { AuthForm } from './Components/AuthForm';
import { LucyLoader } from './Components/LucyLoader';
import {
    UI_ACCENT_GREEN,
    UI_BG_BLACK,
    UI_BORDER_STRONG,
    UI_COLOR_TRANSPARENT,
    UI_PANEL_BG,
    UI_TEXT_PRIMARY_ON_DARK,
    UI_TEXT_SUBTLE,
} from './Constants/uiTheme.ts';

const { Content } = Layout;
const { useBreakpoint } = Grid;

const Configuration = lazy(() => import('./Pages/Configuration').then(module => ({ default: module.default })));

const CONTROL_PATH = '/';
const CONFIG_PATH = '/configuration';
const KNOWN_PATHS = new Set<string>([CONTROL_PATH, CONFIG_PATH]);

/**
 * Render all main pages once and toggle visibility with `display: none`.
 * Keeps page-local state (sliders, edits, expanded panels) alive when the
 * user switches between CONTROL / CONFIGURATION. Lazy pages are only mounted
 * after their first visit so the initial chunk stays small.
 */
const PersistentPages: FC = () => {
    const { pathname } = useLocation();
    const [configVisited, setConfigVisited] = useState(false);

    useEffect(() => {
        if (pathname === CONFIG_PATH) setConfigVisited(true);
    }, [pathname]);

    const isKnown = KNOWN_PATHS.has(pathname);

    const pageStyle = (active: boolean): CSSProperties => ({
        display: active ? 'block' : 'none',
    });

    return (
        <>
            <div style={pageStyle(pathname === CONTROL_PATH)}>
                <RobotControlPanel />
            </div>
            {configVisited ? (
                <div style={pageStyle(pathname === CONFIG_PATH)}>
                    <Suspense
                        fallback={
                            <LucyLoader
                                label="LOADING CONFIGURATION"
                                detail="Preparing the hardware configuration page."
                            />
                        }
                    >
                        <Configuration />
                    </Suspense>
                </div>
            ) : null}
            {!isKnown ? <NotFound /> : null}
        </>
    );
};

function App() {
    const localPassword: string | undefined = import.meta.env.VITE_LOCAL_PASSWORD;
    const localUsername: string | undefined = import.meta.env.VITE_LOCAL_USERNAME;
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [authError, setAuthError] = useState<string>('');
    const screens = useBreakpoint();
    const isMobile = !screens.md;

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
                    <Layout style={{ minHeight: '100vh', backgroundColor: UI_BG_BLACK }}>
                        <Content style={{ paddingBottom: isMobile ? '60px' : '0' }}>
                            <PersistentPages />
                        </Content>
                        <Navigation />
                    </Layout>
                </ActiveHardwareRosProvider>
            </Router>
        </ConfigProvider>
    );
}

export default App;
