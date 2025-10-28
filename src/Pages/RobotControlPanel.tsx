import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Typography,
    Space,
    Button,
    Statistic,
    Row,
    Col,
    Alert,
    Spin,
    Input,
} from 'antd';
import {
    ReloadOutlined,
    ThunderboltOutlined,
} from '@ant-design/icons';
import {
    DndContext,
    rectIntersection,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
} from '@dnd-kit/sortable';

/* Services */
import { JointStateHandler } from "../Services/ros/handlers/JointState.handler";

/* Hooks */
import { useRosConnection } from "../hooks/useRosConnection.hook";

/* Utils */
// import { UrdfParser } from '../Utils/urdfParser.utils.ts';

/* Types */
import type { JointControlState } from '../Constants/robotTypes';
// import { RobotPathResolver } from '../Constants/robotConfig';

/* Components */
import { Page } from '../Components/Page';
import { JointCategory } from '../Components/JointCategory';
import { DraggableCategory } from '../Components/DraggableCategory';
import { PoseManager } from '../Components/PoseManager';
import { ToggleSwitch } from "../Components/ToggleSwitch";
import StreamPlayerModal from "../Components/StreamPlayerModal";
import { ConnectedClientsHandler } from "../Services/ros/handlers/ConnectedClients.handler";
import MediapipeHandTrackerModal from '../Components/MediapipeHandTrackerModal';

const { Text } = Typography;

const REFRESH_RATE = 1000;

export const RobotControlPanel: React.FC = () => {
    const {
        connectionStatus,
        isConnected,
        isConnecting,
        isReconnecting,
        isDisconnected,
        connect,
        reconnect,
        disconnect
    } = useRosConnection();

    const [joints, setJoints] = useState<JointControlState[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showDegrees, setShowDegrees] = useState(true);
    const [categoryOrder, setCategoryOrder] = useState<string[]>([
        'Head',
        'Torso',
        'Left Arm',
        'Right Arm',
        'Left Hand',
        'Right Hand',
        'Base',
    ]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [isSending, setIsSending] = useState(false);

    // ROS URL state
    const ROS_URL_KEY = 'lucy_ros_url';
    const defaultRosUrl = useMemo(() => (
        typeof window !== 'undefined'
            ? (localStorage.getItem(ROS_URL_KEY) || import.meta.env.VITE_ROS_BRIDGE_SERVER_URL || 'wss://localhost:9090')
            : (import.meta.env.VITE_ROS_BRIDGE_SERVER_URL || 'wss://localhost:9090')
    ), []);
    const [rosUrl, setRosUrl] = useState<string>(defaultRosUrl);
    const [connectionError, setConnectionError] = useState<string | null>(null);

    // Floating stream window state
    const STREAM_VISIBLE_KEY = 'lucy_stream_visible';

    const [isStreamVisible, setIsStreamVisible] = useState<boolean>(() => {
        if (typeof window === 'undefined') return false;
        const saved = localStorage.getItem(STREAM_VISIBLE_KEY);
        return saved ? saved === 'true' : false;
    });

    const [isWebcamActive, setIsWebcamActive] = useState<boolean>(false);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    /* Fixtures for first demo - awaiting servos indications in urdf */
    const max_hand_angle = 2.617994; // approx 150 degrees in radians
    const rightHandFixtures: JointControlState[] = [
        { name: 'right_shoulder_yaw_joint', currentValue: 0, targetValue: 0, minValue: 0, maxValue: max_hand_angle, type: 'revolute', category: 'Right Arm' },
        { name: 'right_shoulder_roll_joint', currentValue: 0, targetValue: 0, minValue: 0, maxValue: max_hand_angle, type: 'revolute', category: 'Right Arm' },
        { name: 'right_elbow_joint', currentValue: 0, targetValue: 0, minValue: 0, maxValue: max_hand_angle, type: 'revolute', category: 'Right Arm' },
        { name: 'right_wrist_joint', currentValue: 0, targetValue: 0, minValue: 0, maxValue: max_hand_angle, type: 'revolute', category: 'Right Hand' },
        { name: 'right_thumb_joint', currentValue: 0, targetValue: 0, minValue: 0, maxValue: max_hand_angle, type: 'revolute', category: 'Right Hand' },
        { name: 'right_index_joint', currentValue: 0, targetValue: 0, minValue: 0, maxValue: max_hand_angle, type: 'revolute', category: 'Right Hand' },
        { name: 'right_middle_joint', currentValue: 0, targetValue: 0, minValue: 0, maxValue: max_hand_angle, type: 'revolute', category: 'Right Hand' },
        { name: 'right_ring_joint', currentValue: 0, targetValue: 0, minValue: 0, maxValue: max_hand_angle, type: 'revolute', category: 'Right Hand' },
        { name: 'right_pinky_joint', currentValue: 0, targetValue: 0, minValue: 0, maxValue: max_hand_angle, type: 'revolute', category: 'Right Hand' },
    ]

    const loadUrdfData = () => {
        try {
            setJoints(rightHandFixtures);
            setLoading(false);
            return;

            // setLoading(true);
            // setError(null);
            // setHasError(false);
            //
            // const response = await fetch(RobotPathResolver.getUrdfPath());
            // if (!response.ok) {
            //     throw new Error('Failed to load URDF file');
            // }
            //
            // const urdfContent = await response.text();
            // const parser = new UrdfParser(urdfContent);
            // const parsedJoints = parser.parseJoints();
            // const controlStates = UrdfParser.createJointControlStates(parsedJoints);
            //
            // setJoints(controlStates);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : 'Failed to load robot configuration'
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUrdfData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!isSending) {
            return;
        }

        const interval = setInterval(() => {
            JointStateHandler.getInstance().publishJointStates(joints);
        }, REFRESH_RATE);

        return () => clearInterval(interval);
    }, [isSending, joints]);

    const [countState, setCountState] = useState<number>(0);

    useEffect(() => {
        const handler = new ConnectedClientsHandler((count: number) => {
            setCountState(count);
        });

        return () => {
            handler.unsubscribe();
        };
    }, []);

    const handleJointValueChange = useCallback((name: string, value: number) => {
        setJoints((prevJoints) =>
            prevJoints.map((joint) =>
                joint.name === name
                    ? { ...joint, currentValue: value, targetValue: value }
                    : joint
            )
        );
    }, []);

    const handleResetCategory = useCallback((category: string) => {
        setJoints((prevJoints) =>
            prevJoints.map((joint) => {
                if (joint.category === category) {
                    const midValue = (joint.minValue + joint.maxValue) / 2;
                    return { ...joint, currentValue: midValue, targetValue: midValue };
                }
                return joint;
            })
        );
    }, []);

    const handleResetAll = useCallback(() => {
        setJoints((prevJoints) =>
            prevJoints.map((joint) => {
                const midValue = (joint.minValue + joint.maxValue) / 2;
                return { ...joint, currentValue: midValue, targetValue: midValue };
            })
        );
    }, []);

    const categorizedJoints = useMemo(() => {
        const categories: { [key: string]: JointControlState[] } = {};
        joints.forEach((joint) => {
            if (!categories[joint.category]) {
                categories[joint.category] = [];
            }
            categories[joint.category].push(joint);
        });
        return categories;
    }, [joints]);

    const handleLoadPose = useCallback(
        (poseJoints: Record<string, number>, categoryOrder?: string[]) => {
            setJoints((prevJoints) =>
                prevJoints.map((joint) => ({
                    ...joint,
                    currentValue: poseJoints[joint.name] ?? joint.currentValue,
                    targetValue: poseJoints[joint.name] ?? joint.targetValue,
                }))
            );

            if (categoryOrder) {
                setCategoryOrder(categoryOrder);
            }
        },
        []
    );

    const handleDragStart = useCallback((event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    }, []);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;

        if (active.id !== over?.id) {
            setCategoryOrder((items) => {
                const oldIndex = items.indexOf(active.id as string);
                const newIndex = items.indexOf(over?.id as string);
                return arrayMove(items, oldIndex, newIndex);
            });
        }

        setActiveId(null);
    }, []);

    const handleConnect = async () => {
        setConnectionError(null);
        try {
            if (isConnected) {
                disconnect();
            } else {
                await connect(rosUrl);
                localStorage.setItem(ROS_URL_KEY, rosUrl);
            }
        } catch (error) {
            setConnectionError(error instanceof Error ? error.message : 'Connection failed');
        }
    };

    const handleReconnect = async () => {
        setConnectionError(null);
        try {
            await reconnect(rosUrl);
            localStorage.setItem(ROS_URL_KEY, rosUrl);
        } catch (error) {
            setConnectionError(error instanceof Error ? error.message : 'Reconnection failed');
        }
    };

    const getConnectionStatusText = () => {
        switch (connectionStatus) {
            case 'connected': return 'CONNECTED';
            case 'connecting': return 'CONNECTING...';
            case 'reconnecting': return 'RECONNECTING...';
            case 'disconnected': return 'DISCONNECTED';
            default: return 'UNKNOWN';
        }
    };

    const getConnectionStatusColor = () => {
        if (countState > 1) {
            return '#ffa500';
        }
        switch (connectionStatus) {
            case 'connected': return '#00ff41';
            case 'connecting': return '#ffa500';
            case 'reconnecting': return '#ffa500';
            case 'disconnected': return '#ff4d4f';
            default: return '#666';
        }
    };

    if (loading) {
        return (
            <Page contentStyle={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Spin size="large" />
                <Text style={{ color: '#fff', marginLeft: 16 }}>Loading robot configuration...</Text>
            </Page>
        );
    }

    if (error) {
        return (
            <Page>
                <Alert
                    message="Error Loading Robot Configuration"
                    description={error}
                    type="error"
                    showIcon
                    action={
                        <Button size="small" onClick={loadUrdfData}>
                            Retry
                        </Button>
                    }
                />
            </Page>
        );
    }

    const headerContent = (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div>
                <Space align="center">
                    <Text
                        style={{
                            margin: 0,
                            color: '#00ff41',
                            fontFamily: 'monospace',
                            textShadow: '0 0 10px #00ff41',
                            fontSize: '18px',
                            fontWeight: 'bold',
                        }}
                    >
                        ▲ LUCY CONTROL PANEL
                    </Text>
                </Space>
            </div>

            <div>
                <Space>
                    <Row gutter={12}>
                        <Col>
                            <Statistic
                                title={<Text style={{ color: '#666', fontSize: '10px' }}>TOTAL JOINTS</Text>}
                                value={joints.length}
                                valueStyle={{ color: '#00ff41', fontSize: '16px', fontFamily: 'monospace' }}
                            />
                        </Col>
                        <Col>
                            <Statistic
                                title={<Text style={{ color: '#666', fontSize: '10px' }}>CATEGORIES</Text>}
                                value={Object.keys(categorizedJoints).length}
                                valueStyle={{ color: '#00ff41', fontSize: '16px', fontFamily: 'monospace' }}
                            />
                        </Col>
                        <Col>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: '4px 10px',
                                    borderRadius: 16,
                                    backgroundColor: '#0d0d0d',
                                    border: '1px solid #333'
                                }}>
                                    <span style={{
                                        width: 10,
                                        height: 10,
                                        borderRadius: '50%',
                                        backgroundColor: getConnectionStatusColor(),
                                        boxShadow: `0 0 8px ${getConnectionStatusColor()}`
                                    }} />
                                    <Text style={{
                                        color: getConnectionStatusColor(),
                                        fontFamily: 'monospace',
                                        fontSize: 12
                                    }}>
                                        ROS BRIDGE: {countState > 0 ? countState : ''} {getConnectionStatusText()}
                                    </Text>
                                </div>
                                <Input
                                    size="small"
                                    placeholder="ROS Bridge URL"
                                    value={rosUrl}
                                    onChange={(e) => setRosUrl(e.target.value)}
                                    disabled={isConnecting || isReconnecting}
                                    style={{
                                        width: 200,
                                        backgroundColor: '#0d0d0d',
                                        borderColor: '#333',
                                        color: '#fff',
                                        fontFamily: 'monospace',
                                        fontSize: 12
                                    }}
                                />
                                <Button
                                    size="small"
                                    onClick={handleConnect}
                                    disabled={isConnecting || isReconnecting}
                                    style={{
                                        backgroundColor: isConnected ? 'transparent' : '#00ff41',
                                        color: isConnected ? '#fff' : '#000',
                                        borderColor: isConnected ? '#444' : '#00ff41',
                                        boxShadow: isConnected ? 'none' : '0 0 8px #00ff41',
                                    }}
                                >
                                    {isConnected ? 'DISCONNECT' : 'CONNECT'}
                                </Button>
                                <Button
                                    size="small"
                                    onClick={handleReconnect}
                                    disabled={isDisconnected || isConnecting || isReconnecting}
                                    style={{
                                        backgroundColor: (isConnected || isReconnecting) ? '#ffa500' : 'transparent',
                                        color: (isConnected || isReconnecting) ? '#000' : '#fff',
                                        borderColor: (isConnected || isReconnecting) ? '#ffa500' : '#444',
                                        boxShadow: (isConnected || isReconnecting) ? '0 0 8px #ffa500' : 'none',
                                    }}
                                >
                                    {isReconnecting ? 'RECONNECTING...' : 'RECONNECT'}
                                </Button>
                            </div>
                        </Col>
                    </Row>
                </Space>
            </div>
        </div>
    );

    return (
        <Page
            showHeader
            headerContent={headerContent}
            contentStyle={{ padding: 12, position: 'relative' }}
            removeScrollbars={false}
        >
            {connectionError && (
                <Alert
                    message="Connection Error"
                    description={connectionError}
                    type="error"
                    showIcon
                    closable
                    onClose={() => setConnectionError(null)}
                    style={{ marginBottom: 12 }}
                />
            )}

            <Row gutter={[12, 12]} align="middle" justify="space-between" style={{ marginBottom: 12 }}>
                <Col flex="auto">
                    <Space wrap>
                        <Button
                            icon={<ReloadOutlined />}
                            onClick={handleResetAll}
                            style={{
                                backgroundColor: 'transparent',
                                borderColor: '#444',
                                color: '#fff',
                            }}
                        >
                            RESET ALL
                        </Button>

                        <PoseManager
                            joints={joints}
                            onLoadPose={handleLoadPose}
                            categoryOrder={categoryOrder}
                        />
                        <Button
                            onClick={() => setIsStreamVisible(v => !v)}
                            style={{
                                backgroundColor: isStreamVisible ? '#00ff41' : 'transparent',
                                color: isStreamVisible ? '#000' : '#fff',
                                borderColor: isStreamVisible ? '#00ff41' : '#444',
                                boxShadow: isStreamVisible ? '0 0 10px #00ff41' : 'none',
                            }}
                        >
                            {isStreamVisible ? 'HIDE STREAM' : 'SHOW STREAM'}
                        </Button>
                        <Button
                            onClick={() => setIsWebcamActive(v => !v)}
                            style={{
                                backgroundColor: isWebcamActive ? '#00ff41' : 'transparent',
                                color: isWebcamActive ? '#000' : '#fff',
                                borderColor: isWebcamActive ? '#00ff41' : '#444',
                                boxShadow: isWebcamActive ? '0 0 10px #00ff41' : 'none',
                            }}
                        >
                            {isWebcamActive ? 'HIDE HAND TRACKER' : 'SHOW HAND TRACKER'}
                        </Button>
                    </Space>
                </Col>

                <Row gutter={12} align="middle" justify="end" style={{ flex: 'none' }}>
                    <Col>
                        <ToggleSwitch
                            isOn={isSending}
                            onToggle={() => setIsSending(v => !v)}
                            title="Send instructions"
                            rightIcon={<ThunderboltOutlined />}
                            width={180}
                            height={32}
                        />
                    </Col>

                    <Col>
                        <ToggleSwitch
                            isOn={showDegrees}
                            onToggle={() => setShowDegrees(v => !v)}
                            title="Angle units"
                            textOn="DEGREES"
                            textOff="RADIANS"
                            width={180}
                            height={32}
                        />
                    </Col>
                </Row>
            </Row>

            <DndContext
                sensors={sensors}
                collisionDetection={rectIntersection}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <SortableContext items={categoryOrder} strategy={rectSortingStrategy}>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                            gridAutoRows: '1fr',
                            gap: '12px',
                            width: '100%',
                            alignItems: 'stretch',
                        }}
                    >
                        {categoryOrder.map((category) => {
                            if (!categorizedJoints[category] || categorizedJoints[category].length === 0) {
                                return null;
                            }

                            return (
                                <div key={category} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                    <DraggableCategory
                                        id={category}
                                        category={category}
                                        joints={categorizedJoints[category]}
                                        onJointValueChange={handleJointValueChange}
                                        onResetCategory={handleResetCategory}
                                        showDegrees={showDegrees}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </SortableContext>

                <DragOverlay>
                    {activeId ? (
                        <div style={{ opacity: 0.8, transform: 'rotate(5deg)' }}>
                            <JointCategory
                                category={activeId}
                                joints={categorizedJoints[activeId] || []}
                                onJointValueChange={() => { }}
                                onResetCategory={() => { }}
                                showDegrees={showDegrees}
                            />
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>

            <StreamPlayerModal
                isVisible={isStreamVisible}
                onClose={() => setIsStreamVisible(false)}
                initialPosition={{ x: 100, y: 100 }}
                initialSize={{ w: 480, h: 320 }}
            />
            <MediapipeHandTrackerModal
                isVisible={isWebcamActive}
                onClose={() => setIsWebcamActive(false)}
                initialPosition={{ x: 400, y: 150 }}
                initialSize={{ w: 480, h: 320 }}
            />
        </Page>
    );
};
