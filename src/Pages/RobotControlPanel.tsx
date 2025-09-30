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
// import { UrdfParser } from '../Utils/urdfParser.utils.ts';
import type { JointControlState } from '../Constants/robotTypes';
// import { RobotPathResolver } from '../Constants/robotConfig';
import { JointCategory } from '../Components/JointCategory';
import { DraggableCategory } from '../Components/DraggableCategory';
import { PoseManager } from '../Components/PoseManager';
import { Page } from '../Components/Page';
import { JointStateHandler } from "../Services/ros.service";

const { Text } = Typography;

const REFRESH_RATE = 1000;

export const RobotControlPanel: React.FC = () => {
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
        { name: 'right_thumb_joint', currentValue: 0, targetValue: 0, minValue: 0, maxValue: max_hand_angle, type: 'revolute', category: 'Right Hand' },
        { name: 'right_index_joint', currentValue: 0, targetValue: 0, minValue: 0, maxValue: max_hand_angle, type: 'revolute', category: 'Right Hand' },
        { name: 'right_middle_joint', currentValue: 0, targetValue: 0, minValue: 0, maxValue: max_hand_angle, type: 'revolute', category: 'Right Hand' },
        { name: 'right_ring_joint', currentValue: 0, targetValue: 0, minValue: 0, maxValue: max_hand_angle, type: 'revolute', category: 'Right Hand' },
        { name: 'right_little_joint', currentValue: 0, targetValue: 0, minValue: 0, maxValue: max_hand_angle, type: 'revolute', category: 'Right Hand' },
        { name: 'right_hand_joint', currentValue: 0, targetValue: 0, minValue: 0, maxValue: max_hand_angle, type: 'revolute', category: 'Right Hand' },
    ]

    const loadUrdfData = async () => {
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

    const SendToggle: React.FC<{ isOn: boolean; onToggle: (next: boolean) => void; }>
        = ({ isOn, onToggle }) => {
        return (
            <button
                onClick={() => onToggle(!isOn)}
                aria-pressed={isOn}
                style={{
                    width: 180,
                    height: 32,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    position: 'relative',
                    padding: 2,
                    borderRadius: 18,
                    backgroundColor: '#0d0d0d',
                    border: '1px solid #2a2a2a',
                    cursor: 'pointer',
                    userSelect: 'none',
                    outline: 'none',
                    color: '#00ff41',
                }}
            >
                <div
                    style={{
                        position: 'absolute',
                        top: 2,
                        left: isOn ? 'calc(50% + 2px)' : 2,
                        width: 'calc(50% - 4px)',
                        height: 'calc(100% - 4px)',
                        borderRadius: 16,
                        backgroundColor: '#00ff41',
                        boxShadow: isOn ? '0 0 12px #00ff41' : 'none',
                        transition: 'left 160ms ease, box-shadow 160ms ease',
                    }}
                />
                <span
                    style={{
                        width: '50%',
                        textAlign: 'center',
                        fontFamily: 'monospace',
                        fontSize: 12,
                        letterSpacing: 0.5,
                        zIndex: 1,
                        color: isOn ? '#00ff41' : '#000',
                        opacity: isOn ? 0.9 : 1,
                    }}
                >
                    SEND
                </span>
                <span
                    style={{
                        width: '50%',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        textAlign: 'center',
                        fontFamily: 'monospace',
                        fontSize: 12,
                        letterSpacing: 0.5,
                        zIndex: 1,
                        color: isOn ? '#000' : '#00ff41',
                    }}
                >
                    <ThunderboltOutlined />
                    SENDING
                </span>
            </button>
        );
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
                    </Space>
                </Col>

                <Col>
                    <SendToggle isOn={isSending} onToggle={setIsSending} />
                </Col>

                <Col>
                    <Space>
                        <Space align="center">
                            <Text style={{ color: '#fff', fontFamily: 'monospace' }}>UNIT:</Text>
                            <div
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 2,
                                    padding: 2,
                                    borderRadius: 20,
                                    backgroundColor: '#0d0d0d',
                                    border: '1px solid #333',
                                }}
                            >
                                <button
                                    onClick={() => setShowDegrees(false)}
                                    style={{
                                        appearance: 'none',
                                        border: 'none',
                                        outline: 'none',
                                        cursor: 'pointer',
                                        padding: '4px 10px',
                                        borderRadius: 16,
                                        fontFamily: 'monospace',
                                        fontSize: 12,
                                        letterSpacing: 0.5,
                                        backgroundColor: !showDegrees ? '#00ff41' : 'transparent',
                                        color: !showDegrees ? '#000' : '#00ff41',
                                        boxShadow: !showDegrees ? '0 0 10px #00ff41' : 'none',
                                        transition: 'all 120ms ease-out',
                                    }}
                                >
                                    RAD
                                </button>
                                <button
                                    onClick={() => setShowDegrees(true)}
                                    style={{
                                        appearance: 'none',
                                        border: 'none',
                                        outline: 'none',
                                        cursor: 'pointer',
                                        padding: '4px 10px',
                                        borderRadius: 16,
                                        fontFamily: 'monospace',
                                        fontSize: 12,
                                        letterSpacing: 0.5,
                                        backgroundColor: showDegrees ? '#00ff41' : 'transparent',
                                        color: showDegrees ? '#000' : '#00ff41',
                                        boxShadow: showDegrees ? '0 0 10px #00ff41' : 'none',
                                        transition: 'all 120ms ease-out',
                                    }}
                                >
                                    DEG
                                </button>
                            </div>
                        </Space>
                    </Space>
                </Col>
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
        </Page>
    );
};
