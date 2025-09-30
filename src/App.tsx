import { ConfigProvider, theme } from 'antd';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { RobotControlPanel } from './Pages/RobotControlPanel';
import { Robot3DViewer } from './Pages/Robot3DViewer';
import { Stream } from "./Pages/Stream";
import { Navigation } from './Components/Navigation';
import { NotFound } from './Pages/NotFound';

function App() {
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
