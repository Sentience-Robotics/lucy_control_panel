import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { Typography, Button, Spin, Alert } from 'antd';
import { isWebGLAvailable, STLLoader } from 'three-stdlib';
import * as THREE from 'three';
import ROSLIB from 'roslib';
import { RobotPathResolver } from '../Constants/robotConfig';
import { Page } from '../Components/Page';
import { RobotFKModel } from '../Components/RobotFKModel';
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

interface Robot3DViewerProps {
    /** When true: compact canvas only, no page wrapper or control overlays. */
    embedded?: boolean;
}

const Robot3DViewer: React.FC<Robot3DViewerProps> = ({ embedded = false }) => {
    const { linkMeshes, urdfJoints, loading, loadingStatus, error, reload } = useRobotModel();
    const { isConnected } = useRosConnection();
    const jointAngles = useThrottledJointAngles(isConnected);

    const [wireframe, setWireframe] = useState(false);
    const [opacity, setOpacity] = useState(embedded ? 0.85 : 0.8);
    const [showGrid, setShowGrid] = useState(!embedded);

    // --- Loading state ---
    if (loading) {
        if (embedded) {
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
        return (
            <Page contentStyle={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <Spin size="large" />
                    <Text style={{ color: UI_TEXT_PRIMARY_ON_DARK }}>Loading 3D robot model...</Text>
                </div>
                {loadingStatus && (
                    <Text style={{ color: UI_TEXT_SECONDARY_MUTED, fontSize: 11, fontFamily: 'monospace' }}>
                        {loadingStatus}
                    </Text>
                )}
            </Page>
        );
    }

    // --- Error state ---
    if (error) {
        if (embedded) {
            return (
                <div style={{
                    width: '100%', height: '100%',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    gap: 8, background: UI_BG_BLACK, padding: 12,
                }}>
                    <Text style={{ color: UI_TEXT_PRIMARY_ON_DARK, fontSize: 11, textAlign: 'center' }}>{error}</Text>
                    <button onClick={reload} style={{ fontFamily: 'monospace', cursor: 'pointer' }}>Retry</button>
                </div>
            );
        }
        return (
            <Page>
                <Alert
                    message="Error Loading 3D Model"
                    description={error}
                    type="error"
                    showIcon
                    action={<Button size="small" onClick={loadRobotModel}>Retry</Button>}
                />
            </Page>
        );
    }


    // --- Canvas ---
    const canvas = (
        <Canvas
            camera={{ position: [0, 8, 40], fov: 50, near: 0.1, far: 500 }}
            style={{ width: '100%', height: '100%', background: UI_BG_BLACK }}
        >
            <ambientLight intensity={0.6} />
            <directionalLight position={[10, 10, 5]} intensity={1} castShadow={!embedded} shadow-mapSize={[2048, 2048]} />
            {!embedded && <pointLight position={[-10, -10, -5]} intensity={0.5} color={UI_ACCENT_GREEN} />}

            {!embedded && showGrid && (
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

            <RobotModel
                linkMeshes={linkMeshes}
                urdfJoints={urdfJoints}
                jointAngles={jointAngles}
                opacity={opacity}
                wireframe={!embedded && wireframe}
            />

            <OrbitControls
                target={[0, 8, 0]}
                enablePan={!embedded}
                enableZoom
                enableRotate
                dampingFactor={embedded ? 0.1 : 0.05}
                minDistance={embedded ? 10 : 1}
                maxDistance={embedded ? 100 : 200}
            />
        </Canvas>
    );

    // --- Embedded: bare canvas ---
    if (embedded) return canvas;

    // --- Full page: canvas + overlays + header controls ---
    const headerContent = (
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <Text style={{ color: UI_TEXT_PRIMARY_ON_DARK, fontFamily: 'monospace' }}>WIREFRAME:</Text>
                <div className="tui-toggle">
                    <button onClick={() => setWireframe(false)} className={`tui-toggle-button ${!wireframe ? 'active' : ''}`}>OFF</button>
                    <div className="tui-toggle-divider" />
                    <button onClick={() => setWireframe(true)} className={`tui-toggle-button ${wireframe ? 'active' : ''}`}>ON</button>
                </div>
                <Text style={{ color: UI_TEXT_PRIMARY_ON_DARK, fontFamily: 'monospace' }}>GRID:</Text>
                <div className="tui-toggle">
                    <button onClick={() => setShowGrid(false)} className={`tui-toggle-button ${!showGrid ? 'active' : ''}`}>OFF</button>
                    <div className="tui-toggle-divider" />
                    <button onClick={() => setShowGrid(true)} className={`tui-toggle-button ${showGrid ? 'active' : ''}`}>ON</button>
                </div>
            </div>
        </div>
    );

    return (
        <Page
            showHeader
            title="LUCY 3D VIEWER"
            headerContent={headerContent}
            contentStyle={{ height: 'calc(100vh - 70px)', position: 'relative', padding: 0 }}
        >
            {canvas}

            {/* Controls overlay — top-left */}
            <div style={{
                position: 'absolute', top: 16, left: 16,
                backgroundColor: UI_MODAL_MASK_BG, border: `1px solid ${UI_BORDER_MUTED}`,
                padding: 16, fontFamily: 'monospace', color: UI_TEXT_PRIMARY_ON_DARK, fontSize: '12px',
            }}>
                <div style={{ marginBottom: 8 }}><Text style={{ color: UI_ACCENT_GREEN }}>CONTROLS:</Text></div>
                <div>• Mouse: Rotate view</div>
                <div>• Wheel: Zoom in/out</div>
                <div>• Right click + drag: Pan</div>
                <div style={{ marginTop: 8 }}>
                    <Text style={{ color: UI_ACCENT_GREEN }}>MESHES LOADED: {linkMeshes.length}</Text>
                </div>
                <div style={{ marginTop: 4 }}>
                    <Text style={{ color: jointAngles.size > 0 ? UI_ACCENT_GREEN : UI_TEXT_SECONDARY_MUTED }}>
                        JOINTS: {jointAngles.size > 0 ? `LIVE (${jointAngles.size})` : 'STATIC'}
                    </Text>
                </div>
            </div>

            {/* Opacity control — bottom-left */}
            <div style={{
                position: 'absolute', bottom: 16, left: 16,
                backgroundColor: UI_MODAL_MASK_BG, border: `1px solid ${UI_BORDER_MUTED}`,
                padding: 16, fontFamily: 'monospace', color: UI_TEXT_PRIMARY_ON_DARK,
                fontSize: '12px', minWidth: 200,
            }}>
                <Text style={{ color: UI_ACCENT_GREEN, marginBottom: 8, display: 'block' }}>
                    TRANSPARENCY: {Math.round(opacity * 100)}%
                </Text>
                <input
                    type="range" min="0.1" max="1" step="0.1" value={opacity}
                    onChange={e => setOpacity(parseFloat(e.target.value))}
                    style={{ width: '100%', background: UI_BORDER_MUTED, outline: 'none', height: '4px', borderRadius: '0' }}
                />
            </div>
        </Page>
    );
};

export default Robot3DViewer;
