import React, { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Grid } from '@react-three/drei';
import { Typography, Button, Space, Spin, Alert } from 'antd';
import { STLLoader } from 'three-stdlib';
import * as THREE from 'three';
import { RobotPathResolver } from '../Constants/robotConfig';
import { Page } from '../Components/Page';

const { Text } = Typography;

interface MeshData {
    geometry: THREE.BufferGeometry;
    position: [number, number, number];
    rotation: [number, number, number];
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
            rotation={meshData.rotation}
            scale={meshData.scale}
        >
            <meshStandardMaterial
                key={`${wireframe}-${opacity}`}
                color="#00ff41"
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
    return (
        <group>
            {meshes.map((mesh, index) => (
                <STLMesh key={`${mesh.name}-${index}`} meshData={mesh} opacity={opacity} wireframe={wireframe} />
            ))}
        </group>
    );
};

export const Robot3DViewer: React.FC = () => {
    const [meshes, setMeshes] = useState<MeshData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [wireframe, setWireframe] = useState(false);
    const [opacity, setOpacity] = useState(0.8);
    const [showGrid, setShowGrid] = useState(true);
    const loaderRef = useRef(new STLLoader());

    const loadRobotModel = async () => {
        try {
            setLoading(true);
            setError(null);

            // Load URDF file
            const urdfResponse = await fetch(RobotPathResolver.getUrdfPath());
            if (!urdfResponse.ok) {
                throw new Error('Failed to load URDF file');
            }

            const urdfContent = await urdfResponse.text();

            // Parse URDF to extract mesh references and transforms
            const parser = new DOMParser();
            const urdfDocument = parser.parseFromString(urdfContent, 'text/xml');

            const visualElements = urdfDocument.querySelectorAll('visual');
            const meshDataArray: MeshData[] = [];

            for (const visual of visualElements) {
                const meshElement = visual.querySelector('mesh');
            if (!meshElement) {
                continue;
            }

            const filename = meshElement.getAttribute('filename');
            if (!filename) {
                continue;
            }

            // Convert URDF path to public path using configuration
            const stlPath = RobotPathResolver.resolveUrdfMeshPath(filename);

            try {
                // Load STL geometry
                const geometry = await new Promise<THREE.BufferGeometry>((resolve, reject) => {
                loaderRef.current.load(
                    stlPath,
                    (geometry) => {
                    geometry.computeVertexNormals();
                    geometry.center();
                    resolve(geometry);
                    },
                    undefined,
                    (error) => reject(error)
                );
                });

                // Extract transform information
                const origin = visual.parentElement?.querySelector('origin');
                let position: [number, number, number] = [0, 0, 0];
                let rotation: [number, number, number] = [0, 0, 0];

                if (origin) {
                const xyz = origin.getAttribute('xyz');
                const rpy = origin.getAttribute('rpy');

                if (xyz) {
                    const coords = xyz.split(' ').map(Number);
                    position = [coords[0] || 0, coords[1] || 0, coords[2] || 0];
                }

                if (rpy) {
                    const angles = rpy.split(' ').map(Number);
                    rotation = [angles[0] || 0, angles[1] || 0, angles[2] || 0];
                }
                }

                // Extract scale
                const scaleAttr = meshElement.getAttribute('scale');
                let scale: [number, number, number] = [1, 1, 1];
                if (scaleAttr) {
                    const scaleValues = scaleAttr.split(' ').map(Number);
                    scale = [scaleValues[0] || 1, scaleValues[1] || 1, scaleValues[2] || 1];
                }

                meshDataArray.push({
                    geometry,
                    position,
                    rotation,
                    scale,
                    name: filename
                });
            } catch (meshError) {
                console.warn(`Failed to load mesh ${stlPath}:`, meshError);
            }
        }
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
            <Page contentStyle={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Spin size="large" />
                <Text style={{ color: '#fff', marginLeft: 16 }}>Loading 3D robot model...</Text>
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
        <Text style={{ color: '#fff', fontFamily: 'monospace' }}>WIREFRAME:</Text>
        <div
          style={{
            display: 'inline-flex',
            border: '1px solid #444',
            backgroundColor: '#1a1a1a',
            fontFamily: 'monospace',
            fontSize: '12px'
          }}
        >
          <button
            onClick={() => setWireframe(false)}
            style={{
              padding: '4px 12px',
              border: 'none',
              backgroundColor: !wireframe ? '#00ff41' : 'transparent',
              color: !wireframe ? '#000' : '#666',
              fontFamily: 'monospace',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            OFF
          </button>
          <div style={{ width: '1px', backgroundColor: '#444' }} />
          <button
            onClick={() => setWireframe(true)}
            style={{
              padding: '4px 12px',
              border: 'none',
              backgroundColor: wireframe ? '#00ff41' : 'transparent',
              color: wireframe ? '#000' : '#666',
              fontFamily: 'monospace',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            ON
          </button>
        </div>

        <Text style={{ color: '#fff', fontFamily: 'monospace' }}>GRID:</Text>
        <div
          style={{
            display: 'inline-flex',
            border: '1px solid #444',
            backgroundColor: '#1a1a1a',
            fontFamily: 'monospace',
            fontSize: '12px'
          }}
        >
          <button
            onClick={() => setShowGrid(false)}
            style={{
              padding: '4px 12px',
              border: 'none',
              backgroundColor: !showGrid ? '#00ff41' : 'transparent',
              color: !showGrid ? '#000' : '#666',
              fontFamily: 'monospace',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            OFF
          </button>
          <div style={{ width: '1px', backgroundColor: '#444' }} />
          <button
            onClick={() => setShowGrid(true)}
            style={{
              padding: '4px 12px',
              border: 'none',
              backgroundColor: showGrid ? '#00ff41' : 'transparent',
              color: showGrid ? '#000' : '#666',
              fontFamily: 'monospace',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
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
            position: [5, 5, 5],
            fov: 50,
            near: 0.1,
            far: 1000
          }}
          style={{ background: '#000' }}
        >
          <ambientLight intensity={0.6} />
          <directionalLight
            position={[10, 10, 5]}
            intensity={1}
            castShadow
            shadow-mapSize={[2048, 2048]}
          />
          <pointLight position={[-10, -10, -5]} intensity={0.5} color="#00ff41" />

          {showGrid && (
            <Grid
              args={[20, 20]}
              cellSize={1}
              cellThickness={0.5}
              cellColor="#00ff41"
              sectionSize={5}
              sectionThickness={1}
              sectionColor="#ffffff"
              fadeDistance={30}
              fadeStrength={1}
            />
          )}

          <RobotModel meshes={meshes} opacity={opacity} wireframe={wireframe} />

          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            dampingFactor={0.05}
            screenSpacePanning={false}
            minDistance={1}
            maxDistance={50}
          />

          <Environment preset="warehouse" />
        </Canvas>

        {/* Overlay controls */}
        <div
          style={{
            position: 'absolute',
            top: 16,
            left: 16,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            border: '1px solid #333',
            padding: 16,
            fontFamily: 'monospace',
            color: '#fff',
            fontSize: '12px'
          }}
        >
          <div style={{ marginBottom: 8 }}>
            <Text style={{ color: '#00ff41' }}>CONTROLS:</Text>
          </div>
          <div>• Mouse: Rotate view</div>
          <div>• Wheel: Zoom in/out</div>
          <div>• Right click + drag: Pan</div>
          <div style={{ marginTop: 8 }}>
            <Text style={{ color: '#00ff41' }}>MESHES LOADED: {meshes.length}</Text>
          </div>
        </div>

        {/* Opacity control */}
        <div
          style={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            border: '1px solid #333',
            padding: 16,
            fontFamily: 'monospace',
            color: '#fff',
            fontSize: '12px',
            minWidth: 200
          }}
        >
          <Text style={{ color: '#00ff41', marginBottom: 8, display: 'block' }}>
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
              background: '#333',
              outline: 'none',
              height: '4px',
              borderRadius: '0'
            }}
          />
        </div>
      </Page>
  );
};
