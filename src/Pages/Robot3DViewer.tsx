import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { Typography, Spin } from 'antd';
import { RobotFKModel } from '../Components/RobotFKModel';
import { StreamSwitch } from '../Components/StreamSwitch';
import { useRobotModel } from '../hooks/useRobotModel';
import { useRosConnection } from '../hooks/useRosConnection.hook';
import { useThrottledJointAngles } from '../hooks/useThrottledJointAngles';
import {
    UI_ACCENT_GREEN,
    UI_BG_BLACK,
    UI_BORDER_MUTED,
    UI_MODAL_MASK_BG,
    UI_TEXT_PRIMARY_ON_DARK,
    UI_TEXT_SECONDARY_MUTED,
} from '../Constants/uiTheme.ts';

const { Text } = Typography;

const Robot3DViewer: React.FC = () => {
    const { robot, loading, loadingStatus, error, reload } = useRobotModel();
    const { isConnected } = useRosConnection();
    const jointAngles = useThrottledJointAngles(isConnected);

    // Default to DAE — matches the urdf-loader initial state before any material override
    const [useOriginalTexture, setUseOriginalTexture] = useState(true);
    const [showGrid, setShowGrid] = useState(true);
    const [opacity, setOpacity] = useState(0.85);
    const [wireframe, setWireframe] = useState(false);

    if (loading) {
        return (
            <div style={{
                width: '100%', height: '100%',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 8, background: UI_BG_BLACK,
            }}>
                <Spin size="default" />
                {loadingStatus && (
                    <Text style={{ color: UI_TEXT_SECONDARY_MUTED, fontSize: 10, fontFamily: 'monospace' }}>
                        {loadingStatus}
                    </Text>
                )}
            </div>
        );
    }

    if (error) {
        return (
            <div style={{
                width: '100%', height: '100%',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 8, background: UI_BG_BLACK, padding: 12,
            }}>
                {error.split('\n').map((line, i) => (
                    <Text key={i} style={{ color: UI_TEXT_PRIMARY_ON_DARK, fontSize: 11, textAlign: 'center' }}>
                        {line}
                    </Text>
                ))}
                <button onClick={reload} style={{ fontFamily: 'monospace', cursor: 'pointer' }}>Retry</button>
            </div>
        );
    }

    const isGreenMode = !useOriginalTexture;

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <Canvas
                camera={{ position: [0, 8, 40], fov: 50, near: 0.1, far: 500 }}
                style={{ width: '100%', height: '100%', background: UI_BG_BLACK }}
            >
                <ambientLight intensity={0.6} />
                <directionalLight position={[10, 10, 5]} intensity={1} castShadow shadow-mapSize={[2048, 2048]} />
                <pointLight position={[-10, -10, -5]} intensity={0.5} color={UI_ACCENT_GREEN} />

                {showGrid && (
                    <Grid
                        args={[60, 60]}
                        cellSize={2}
                        cellThickness={0.5}
                        cellColor={UI_ACCENT_GREEN}
                        sectionSize={10}
                        sectionThickness={1}
                        sectionColor={UI_TEXT_PRIMARY_ON_DARK}
                        fadeDistance={80}
                        fadeStrength={1}
                    />
                )}

                {robot && (
                    <RobotFKModel
                        robot={robot}
                        jointAngles={jointAngles}
                        opacity={opacity}
                        wireframe={wireframe}
                        useOriginalTexture={useOriginalTexture}
                    />
                )}

                <OrbitControls
                    target={[0, 8, 0]}
                    enablePan
                    enableZoom
                    enableRotate
                    dampingFactor={0.1}
                    minDistance={10}
                    maxDistance={100}
                />
            </Canvas>

            {/* Controls hint — top-left */}
            <div style={{
                position: 'absolute',
                top: 10,
                left: 10,
                backgroundColor: UI_MODAL_MASK_BG,
                border: `1px solid ${UI_BORDER_MUTED}`,
                padding: '8px 12px',
                fontFamily: 'monospace',
                fontSize: 10,
                color: UI_TEXT_PRIMARY_ON_DARK,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                pointerEvents: 'none',
                userSelect: 'none',
            }}>
                <span style={{ color: UI_ACCENT_GREEN, fontWeight: 'bold', letterSpacing: 1 }}>CONTROLS:</span>
                <div style={{ color: UI_TEXT_SECONDARY_MUTED, fontSize: 9, lineHeight: 1.6 }}>
                    <div>• drag · rotate</div>
                    <div>• scroll · zoom</div>
                    <div>• R-drag · pan</div>
                </div>
            </div>

            {/* Settings — bottom-left */}
            <div style={{
                position: 'absolute',
                bottom: 45,
                left: 10,
                backgroundColor: UI_MODAL_MASK_BG,
                border: `1px solid ${UI_BORDER_MUTED}`,
                padding: '8px 12px',
                fontFamily: 'monospace',
                fontSize: 10,
                color: UI_TEXT_PRIMARY_ON_DARK,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
            }}>
                {/* Opacity — GRN mode only */}
                {isGreenMode && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: UI_ACCENT_GREEN, minWidth: 42 }}>OP {Math.round(opacity * 100)}%</span>
                        <input
                            type="range" min="0.1" max="1" step="0.1" value={opacity}
                            onChange={e => setOpacity(parseFloat(e.target.value))}
                            style={{ width: 56, cursor: 'pointer' }}
                        />
                    </div>
                )}

                {/* Wireframe — GRN mode only */}
                {isGreenMode && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: UI_TEXT_SECONDARY_MUTED, minWidth: 32 }}>WIRE</span>
                        <StreamSwitch labelA="OFF" labelB="ON" value={wireframe} onChange={setWireframe} />
                    </div>
                )}

                {/* Texture */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: UI_TEXT_SECONDARY_MUTED, minWidth: 32 }}>TEX</span>
                    <StreamSwitch labelA="GRN" labelB="DAE" value={useOriginalTexture} onChange={setUseOriginalTexture} />
                </div>

                {/* Grid — always last */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: UI_TEXT_SECONDARY_MUTED, minWidth: 32 }}>GRID</span>
                    <StreamSwitch labelA="OFF" labelB="ON" value={showGrid} onChange={setShowGrid} />
                </div>
            </div>
        </div>
    );
};

export default Robot3DViewer;
