import React, { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Grid } from '@react-three/drei';
import { Typography, Button, Spin, Alert } from 'antd';
import {isWebGLAvailable, STLLoader} from 'three-stdlib';
import * as THREE from 'three';
import { RobotPathResolver } from '../Constants/robotConfig';
import { Page } from '../Components/Page';
import {
    UI_ACCENT_GREEN,
    UI_BG_BLACK,
    UI_BORDER_MUTED,
    UI_MODAL_MASK_BG,
    UI_TEXT_PRIMARY_ON_DARK,
    UI_TEXT_SECONDARY_MUTED,
} from '../Constants/uiTheme.ts';

const { Text } = Typography;

// --- URDF parsing types (internal) ---

interface UrdfVisual {
    meshFilename: string;
    xyz: [number, number, number];
    rpy: [number, number, number];
    scale: [number, number, number];
}

interface UrdfJoint {
    parentLink: string;
    xyz: [number, number, number];
    rpy: [number, number, number];
}

// --- Render types ---

interface MeshData {
    geometry: THREE.BufferGeometry;
    position: [number, number, number];
    quaternion: THREE.Quaternion;
    scale: [number, number, number];
    name: string;
}

interface STLMeshProps {
    meshData: MeshData;
    opacity: number;
    wireframe: boolean;
}

const STLMesh: React.FC<STLMeshProps> = ({ meshData, opacity, wireframe }) => {
    return (
        <mesh
            geometry={meshData.geometry}
            position={meshData.position}
            quaternion={meshData.quaternion}
            scale={meshData.scale}
        >
            <meshStandardMaterial
                key={`${wireframe}-${opacity}`}
                color={UI_ACCENT_GREEN}
                transparent
                opacity={opacity}
                wireframe={wireframe}
                roughness={0.3}
                metalness={0.7}
            />
        </mesh>
    );
};

const RobotModel: React.FC<{ meshes: MeshData[]; opacity: number; wireframe: boolean }> = ({ meshes, opacity, wireframe }) => {
    // URDF uses Z-up convention (positive Z = head, z≈0 = feet/base).
    // Rx(-π/2) maps URDF +Z → Three.js +Y so the robot stands upright.
    return (
        <group rotation={[-Math.PI / 2, 0, 0]}>
            {meshes.map((mesh, index) => (
                <STLMesh key={`${mesh.name}-${index}`} meshData={mesh} opacity={opacity} wireframe={wireframe} />
            ))}
        </group>
    );
};

// Parse a space-separated xyz/rpy/scale attribute into a typed triple.
const parseVec3 = (attr: string | null | undefined): [number, number, number] => {
    if (!attr) return [0, 0, 0];
    const v = attr.trim().split(/\s+/).map(Number);
    return [v[0] || 0, v[1] || 0, v[2] || 0];
};

// Build a 4×4 transform from a URDF origin (xyz translation + rpy Euler XYZ rotation).
const makeTransform = (xyz: [number, number, number], rpy: [number, number, number]): THREE.Matrix4 => {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rpy[0], rpy[1], rpy[2], 'XYZ'));
    return new THREE.Matrix4().compose(new THREE.Vector3(...xyz), q, new THREE.Vector3(1, 1, 1));
};

const Robot3DViewer: React.FC = () => {
    const [meshes, setMeshes] = useState<MeshData[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingStatus, setLoadingStatus] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [wireframe, setWireframe] = useState(false);
    const [opacity, setOpacity] = useState(0.8);
    const [showGrid, setShowGrid] = useState(true);
    const loaderRef = useRef(new STLLoader());

    const loadRobotModel = async () => {
        if (!isWebGLAvailable()) {
            setError('WebGL is not supported or activated in your browser. Please use a WebGL-compatible browser.');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const urdfUrl = RobotPathResolver.getUrdfPath();
            setLoadingStatus(`Fetching ${urdfUrl}…`);
            console.group('[3DViewer] Loading URDF');
            console.log('URL:', urdfUrl);

            const urdfResponse = await fetch(urdfUrl);
            console.log('HTTP status:', urdfResponse.status, urdfResponse.statusText);
            if (!urdfResponse.ok) throw new Error('Failed to load URDF file');

            const urdfContent = await urdfResponse.text();
            const parser = new DOMParser();
            const urdfDoc = parser.parseFromString(urdfContent, 'text/xml');

            // --- 1. Parse links → their visuals ---
            const linkVisualsMap = new Map<string, UrdfVisual[]>();
            for (const linkEl of urdfDoc.querySelectorAll('link')) {
                const linkName = linkEl.getAttribute('name') ?? '';
                const visuals: UrdfVisual[] = [];
                for (const visualEl of linkEl.querySelectorAll('visual')) {
                    const meshEl = visualEl.querySelector('mesh');
                    if (!meshEl) continue;
                    const filename = meshEl.getAttribute('filename');
                    if (!filename) continue;
                    const originEl = visualEl.querySelector('origin');
                    const scaleAttr = meshEl.getAttribute('scale');
                    visuals.push({
                        meshFilename: filename,
                        xyz: parseVec3(originEl?.getAttribute('xyz')),
                        rpy: parseVec3(originEl?.getAttribute('rpy')),
                        scale: scaleAttr ? parseVec3(scaleAttr) : [1, 1, 1],
                    });
                }
                if (visuals.length > 0) linkVisualsMap.set(linkName, visuals);
            }

            // --- 2. Parse joints → child-to-joint map ---
            const childToJoint = new Map<string, UrdfJoint>();
            for (const jointEl of urdfDoc.querySelectorAll('joint')) {
                const parentEl = jointEl.querySelector('parent');
                const childEl = jointEl.querySelector('child');
                if (!parentEl || !childEl) continue;
                const originEl = jointEl.querySelector('origin');
                childToJoint.set(childEl.getAttribute('link') ?? '', {
                    parentLink: parentEl.getAttribute('link') ?? '',
                    xyz: parseVec3(originEl?.getAttribute('xyz')),
                    rpy: parseVec3(originEl?.getAttribute('rpy')),
                });
            }

            const totalLinks = urdfDoc.querySelectorAll('link').length;
            const totalJoints = urdfDoc.querySelectorAll('joint').length;
            const totalVisuals = [...linkVisualsMap.values()].reduce((s, v) => s + v.length, 0);
            console.log(`Links: ${totalLinks} | Joints: ${totalJoints} | Visual meshes: ${totalVisuals}`);
            setLoadingStatus(`Parsed URDF — ${totalLinks} links, ${totalVisuals} visuals`);

            // --- 3. Compute world transform for each link (joint chain walk) ---
            const worldMatCache = new Map<string, THREE.Matrix4>();
            const getWorldMat = (linkName: string): THREE.Matrix4 => {
                const hit = worldMatCache.get(linkName);
                if (hit) return hit;
                const joint = childToJoint.get(linkName);
                if (!joint) {
                    // Root link — identity
                    const m = new THREE.Matrix4();
                    worldMatCache.set(linkName, m);
                    return m;
                }
                const result = new THREE.Matrix4().multiplyMatrices(
                    getWorldMat(joint.parentLink),
                    makeTransform(joint.xyz, joint.rpy)
                );
                worldMatCache.set(linkName, result);
                return result;
            };

            // --- 4. Load STL files and build MeshData with full world transforms ---
            const allVisuals: Array<{ linkName: string; visual: UrdfVisual }> = [];
            for (const [linkName, visuals] of linkVisualsMap) {
                for (const visual of visuals) allVisuals.push({ linkName, visual });
            }

            const total = allVisuals.length;
            const meshDataArray: MeshData[] = [];
            let loadedCount = 0;
            let failedCount = 0;

            for (const { linkName, visual } of allVisuals) {
                const shortName = visual.meshFilename.split('/').pop() ?? visual.meshFilename;
                setLoadingStatus(`Loading mesh ${loadedCount + failedCount + 1}/${total}: ${shortName}`);

                // World transform = accumulated joint chain × visual origin offset
                const worldMat = new THREE.Matrix4().multiplyMatrices(
                    getWorldMat(linkName),
                    makeTransform(visual.xyz, visual.rpy)
                );
                const pos = new THREE.Vector3();
                const quat = new THREE.Quaternion();
                const scl = new THREE.Vector3();
                worldMat.decompose(pos, quat, scl);

                const stlPath = RobotPathResolver.resolveUrdfMeshPath(visual.meshFilename);
                try {
                    const geometry = await new Promise<THREE.BufferGeometry>((resolve, reject) => {
                        loaderRef.current.load(stlPath, (geo) => { geo.computeVertexNormals(); resolve(geo); }, undefined, reject);
                    });

                    geometry.computeBoundingBox();
                    const size = new THREE.Vector3();
                    geometry.boundingBox!.getSize(size);

                    console.log(
                        `[mesh OK] ${shortName}`
                        + ` | link=${linkName}`
                        + ` | world=(${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)})`
                        + ` | bbox=(${size.x.toFixed(2)}, ${size.y.toFixed(2)}, ${size.z.toFixed(2)})`
                    );
                    loadedCount++;
                    meshDataArray.push({ geometry, position: [pos.x, pos.y, pos.z], quaternion: quat, scale: visual.scale, name: visual.meshFilename });
                } catch (meshError) {
                    failedCount++;
                    console.warn(`[mesh FAIL] ${stlPath}:`, meshError);
                }
            }

            console.log(`[3DViewer] Done — loaded: ${loadedCount}, failed: ${failedCount}`);
            console.groupEnd();
            setLoadingStatus(`Done — ${loadedCount} meshes loaded`);
            setMeshes(meshDataArray);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load robot model');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRobotModel();
    }, []);

    if (loading) {
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

    if (error) {
        return (
            <Page>
                <Alert
                    message="Error Loading 3D Model"
                    description={error}
                    type="error"
                    showIcon
                    action={
                        <Button size="small" onClick={loadRobotModel}>
                            Retry
                        </Button>
                    }
                />
            </Page>
        );
    }

  const headerContent = (
    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Text style={{ color: UI_TEXT_PRIMARY_ON_DARK, fontFamily: 'monospace' }}>WIREFRAME:</Text>
        <div className="tui-toggle">
          <button
            onClick={() => setWireframe(false)}
            className={`tui-toggle-button ${!wireframe ? 'active' : ''}`}
          >
            OFF
          </button>
          <div className="tui-toggle-divider" />
          <button
            onClick={() => setWireframe(true)}
            className={`tui-toggle-button ${wireframe ? 'active' : ''}`}
          >
            ON
          </button>
        </div>

        <Text style={{ color: UI_TEXT_PRIMARY_ON_DARK, fontFamily: 'monospace' }}>GRID:</Text>
        <div className="tui-toggle">
          <button
            onClick={() => setShowGrid(false)}
            className={`tui-toggle-button ${!showGrid ? 'active' : ''}`}
          >
            OFF
          </button>
          <div className="tui-toggle-divider" />
          <button
            onClick={() => setShowGrid(true)}
            className={`tui-toggle-button ${showGrid ? 'active' : ''}`}
          >
            ON
          </button>
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
        <Canvas
          camera={{
            // Robot spans Three.js y ≈ 0 (feet) to +15 (head) after Z-up→Y-up rotation.
            position: [0, 8, 40],
            fov: 50,
            near: 0.1,
            far: 500
          }}
          style={{ background: UI_BG_BLACK }}
        >
          <ambientLight intensity={0.6} />
          <directionalLight
            position={[10, 10, 5]}
            intensity={1}
            castShadow
            shadow-mapSize={[2048, 2048]}
          />
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

          <RobotModel meshes={meshes} opacity={opacity} wireframe={wireframe} />

          <OrbitControls
            target={[0, 8, 0]}
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            dampingFactor={0.05}
            screenSpacePanning={false}
            minDistance={1}
            maxDistance={200}
          />

          <Environment preset="warehouse" />
        </Canvas>

        {/* Overlay controls */}
        <div
          style={{
            position: 'absolute',
            top: 16,
            left: 16,
            backgroundColor: UI_MODAL_MASK_BG,
            border: `1px solid ${UI_BORDER_MUTED}`,
            padding: 16,
            fontFamily: 'monospace',
            color: UI_TEXT_PRIMARY_ON_DARK,
            fontSize: '12px'
          }}
        >
          <div style={{ marginBottom: 8 }}>
            <Text style={{ color: UI_ACCENT_GREEN }}>CONTROLS:</Text>
          </div>
          <div>• Mouse: Rotate view</div>
          <div>• Wheel: Zoom in/out</div>
          <div>• Right click + drag: Pan</div>
          <div style={{ marginTop: 8 }}>
            <Text style={{ color: UI_ACCENT_GREEN }}>MESHES LOADED: {meshes.length}</Text>
          </div>
        </div>

        {/* Opacity control */}
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            backgroundColor: UI_MODAL_MASK_BG,
            border: `1px solid ${UI_BORDER_MUTED}`,
            padding: 16,
            fontFamily: 'monospace',
            color: UI_TEXT_PRIMARY_ON_DARK,
            fontSize: '12px',
            minWidth: 200
          }}
        >
          <Text style={{ color: UI_ACCENT_GREEN, marginBottom: 8, display: 'block' }}>
            TRANSPARENCY: {Math.round(opacity * 100)}%
          </Text>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.1"
            value={opacity}
            onChange={(e) => setOpacity(parseFloat(e.target.value))}
            style={{
              width: '100%',
              background: UI_BORDER_MUTED,
              outline: 'none',
              height: '4px',
              borderRadius: '0'
            }}
          />
        </div>
      </Page>
  );
};

export default Robot3DViewer;
