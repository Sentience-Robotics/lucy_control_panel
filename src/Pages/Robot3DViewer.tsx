import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { Typography } from 'antd';
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

/** Width of the bottom-left settings box. Switches sit flush right, the
 *  opacity slider stretches to fill — both react to this single value. */
const SETTINGS_BOX_WIDTH = 150;

const MOUSE_HINTS = ['L-drag · rotate', 'scroll · zoom', 'R-drag · pan'];

const CENTERED_FILL: React.CSSProperties = {
    width: '100%', height: '100%',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    gap: 8, background: UI_BG_BLACK,
};

/** Shared chrome for the floating overlay panels (each adds its own position). */
const OVERLAY_BOX: React.CSSProperties = {
    position: 'absolute',
    left: 10,
    backgroundColor: UI_MODAL_MASK_BG,
    border: `1px solid ${UI_BORDER_MUTED}`,
    padding: '8px 12px',
    fontFamily: 'monospace',
    fontSize: 10,
    color: UI_TEXT_PRIMARY_ON_DARK,
    display: 'flex',
    flexDirection: 'column',
};

const SWITCH_ROW: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6,
};

const SwitchRow: React.FC<{
    label: string;
    value: boolean;
    onChange: (value: boolean) => void;
}> = ({ label, value, onChange }) => (
    <div style={SWITCH_ROW}>
        <span style={{ color: UI_TEXT_SECONDARY_MUTED }}>{label}</span>
        <StreamSwitch value={value} onChange={onChange} />
    </div>
);

/** Green load bar overlaid at the top of the view: indeterminate slide until
 *  mesh progress is known, then fills left-to-right. */
const LoadingBar: React.FC<{ progress: number }> = ({ progress }) => {
    const indeterminate = progress <= 0;
    return (
        <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 3,
            background: UI_BORDER_MUTED, overflow: 'hidden', zIndex: 10,
        }}>
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    background: UI_ACCENT_GREEN,
                    boxShadow: `0 0 8px ${UI_ACCENT_GREEN}`,
                    ...(indeterminate
                        ? { width: '40%', animation: 'urdfLoadSlide 1.1s ease-in-out infinite' }
                        : { left: 0, width: `${Math.round(progress * 100)}%`, transition: 'width 0.2s ease' }),
                }}
            />
            <style>{'@keyframes urdfLoadSlide { 0% { left: -40%; } 100% { left: 100%; } }'}</style>
        </div>
    );
};

const Robot3DViewer: React.FC = () => {
    const { robot, loading, progress, error, reload } = useRobotModel();
    const { isConnected } = useRosConnection();
    const jointAngles = useThrottledJointAngles(isConnected);

    // Default to DAE — matches the urdf-loader initial state before any material override
    const [useOriginalTexture, setUseOriginalTexture] = useState(true);
    const [showGrid, setShowGrid] = useState(true);
    const [opacity, setOpacity] = useState(0.85);
    const [wireframe, setWireframe] = useState(false);

    if (error) {
        return (
            <div style={{ ...CENTERED_FILL, padding: 12 }}>
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
            {loading && <LoadingBar progress={progress} />}
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
            <div style={{ ...OVERLAY_BOX, top: 10, gap: 4, pointerEvents: 'none', userSelect: 'none' }}>
                <span style={{ color: UI_ACCENT_GREEN, fontWeight: 'bold', letterSpacing: 1 }}>CONTROLS:</span>
                <div style={{ color: UI_TEXT_SECONDARY_MUTED, fontSize: 9, lineHeight: 1.6 }}>
                    {MOUSE_HINTS.map(hint => <div key={hint}>• {hint}</div>)}
                </div>
            </div>

            {/* Settings — bottom-left */}
            <div style={{ ...OVERLAY_BOX, bottom: 45, width: SETTINGS_BOX_WIDTH, gap: 6 }}>
                {/* Opacity & wireframe only affect the green override */}
                {isGreenMode && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{ color: UI_ACCENT_GREEN }}>OPACITY {Math.round(opacity * 100)}%</span>
                        <input
                            type="range" min="0.1" max="1" step="0.1" value={opacity}
                            onChange={e => setOpacity(parseFloat(e.target.value))}
                            style={{ width: '100%', cursor: 'pointer' }}
                        />
                    </div>
                )}
                {isGreenMode && <SwitchRow label="WIRE" value={wireframe} onChange={setWireframe} />}
                <SwitchRow label="TEXTURE" value={useOriginalTexture} onChange={setUseOriginalTexture} />
                <SwitchRow label="GRID" value={showGrid} onChange={setShowGrid} />
            </div>
        </div>
    );
};

export default Robot3DViewer;
