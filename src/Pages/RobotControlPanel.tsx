import React, {
    useState,
    useRef,
    useEffect,
    useCallback,
    useMemo,
    lazy,
    Suspense,
} from 'react';
import { Typography, Space, Button, Row, Col, Alert, Spin, Tooltip, Modal, message } from 'antd';
import {
    ReloadOutlined,
    ThunderboltOutlined,
    StopOutlined,
    InfoCircleOutlined,
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
import { ControlModeHandler } from "../Services/ros/handlers/ControlMode.handler";
import { storageService } from '../Services/storage.service';
import type { SavedAnimation, SavedPose } from '../Services/storage.service';

/* Hooks */
import { useRosConnection } from "../hooks/useRosConnection.hook";
import { useActiveHardwareRos } from '../contexts/ActiveHardwareRosContext';

/* Types */
import type { JointControlState } from '../Constants/robotTypes';
import { degreeToRadian } from '../Utils/math.utils';

/* Components */
import { Page } from '../Components/Page';
import { LucyLoader } from '../Components/LucyLoader';
import { JointCategory } from '../Components/JointCategory';
import { DraggableCategory } from '../Components/DraggableCategory';
import { PoseManager } from '../Components/PoseManager';
import { AnimationManager } from '../Components/AnimationManager';
import { ToggleSwitch } from "../Components/ToggleSwitch";
import { StreamPlayerModal } from "../Components/StreamPlayerModal";
import { MovableModal } from '../Components/MovableModal';
import type { ControllerJointConfig } from '../Constants/rosConfig';
import {
    UI_ACCENT_BOX_SHADOW_STRONG,
    UI_ACCENT_GREEN,
    UI_BORDER_SOFT,
    UI_COLOR_TRANSPARENT,
    UI_ERROR,
    UI_MODAL_MASK_BG,
    UI_TEXT_ON_ACCENT,
    UI_TEXT_PRIMARY_ON_DARK,
    UI_TEXT_SUBTLE,
    UI_WARNING,
} from '../Constants/uiTheme.ts';

const MediapipeHandTracker = lazy(() => import('../Components/MediapipeHandTracker').then(module => ({ default: module.default })));

const { Text, Title } = Typography;

const REFRESH_RATE = 300;
const BASE_ANIMATION_INTERVAL = 1000; // ms per keyframe at 1x speed

export const RobotControlPanel: React.FC = () => {
    const { isConnected, isConnecting } = useRosConnection();

    const {
        controllerConfigsFromActive,
        activeHardwareLoading,
        activeHardwareError,
        refetchActiveHardware,
    } = useActiveHardwareRos();

    const [joints, setJoints] = useState<JointControlState[]>([]);
    const jointsRef = useRef<JointControlState[]>(joints);
    const actualPositionsRef = useRef<Map<string, number>>(new Map());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showDegrees, setShowDegrees] = useState(true);
    const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [isSending, setIsSending] = useState(false);
    const isSendingRef = useRef(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const animationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [showControlTakenModal, setShowControlTakenModal] = useState(false);
    const retakeCountRef = useRef(0);

    // Floating stream window state
    const STREAM_VISIBLE_KEY = 'lucy_stream_visible';

    const [isStreamVisible, setIsStreamVisible] = useState<boolean>(() => {
        if (typeof window === 'undefined') { return false; }
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

    /** Build initial joint list from controller config (ros2_control joint names). */
    const buildJointsFromControllerConfig = useCallback((configs: ControllerJointConfig[]): JointControlState[] => {
        const defaultMin = 0;
        const defaultMax = Math.PI;
        const joints: JointControlState[] = [];
        for (const c of configs) {
            for (const name of c.joints) {
                const lim = c.jointLimits?.[name];
                joints.push({
                    name,
                    currentValue: 0,
                    targetValue: 0,
                    minValue: lim ? degreeToRadian(lim.minDeg) : defaultMin,
                    maxValue: lim ? degreeToRadian(lim.maxDeg) : defaultMax,
                    type: 'revolute',
                    category: c.defaultCategory,
                    ...(lim && { restValue: degreeToRadian(lim.defaultDeg) }),
                });
            }
        }
        return joints;
    }, []);

    useEffect(() => {
        if (!isConnected) {
            setLoading(false);
            setError(null);
            JointStateHandler.getInstance([]);
            setJoints([]);
            setCategoryOrder([]);
            // Ensure control mode is always OFF when the connection drops so that
            // reconnecting never starts with control already active.
            setIsSending(false);
            return;
        }

        if (activeHardwareLoading) {
            setLoading(true);
            setError(null);
            return;
        }

        setLoading(false);

        if (activeHardwareError) {
            setError(activeHardwareError);
            return;
        }

        const ctrls = controllerConfigsFromActive;
        if (!ctrls || ctrls.length === 0) {
            setError('Active hardware config has no joint controllers (check boards / actuators).');
            return;
        }

        setError(null);
        JointStateHandler.getInstance(ctrls);
        setJoints((prev) => {
            const byName = new Map(prev.map((j) => [j.name, j]));
            const next = buildJointsFromControllerConfig(ctrls);
            return next.map((j) => {
                const existing = byName.get(j.name);
                return existing
                    ? { ...j, currentValue: existing.currentValue, targetValue: existing.targetValue }
                    : j;
            });
        });
        setCategoryOrder((prevOrder) => {
            const nextCats = [...new Set(ctrls.map((c) => c.defaultCategory))];
            const preserved = prevOrder.filter((c) => nextCats.includes(c));
            const extras = nextCats.filter((c) => !preserved.includes(c));
            return [...preserved, ...extras];
        });
    }, [
        isConnected,
        activeHardwareLoading,
        activeHardwareError,
        controllerConfigsFromActive,
        buildJointsFromControllerConfig,
    ]);

    useEffect(() => {
        jointsRef.current = joints;
    }, [joints]);

    useEffect(() => {
        isSendingRef.current = isSending;
    }, [isSending]);


    useEffect(() => {
        if (!isConnected) return;
        const unsubscribe = ControlModeHandler.getInstance().onControlTakenByOther(() => {
            if (isSendingRef.current) {
                setShowControlTakenModal(true);
            }
            setIsSending(false);
        });
        return unsubscribe;
    }, [isConnected]);

    // Mirror joint positions published by the controlling client.
    // joints.length is in deps so we re-subscribe once hardware configs are loaded.
    useEffect(() => {
        if (isSending || !isConnected || joints.length === 0) return;
        const unsubscribe = JointStateHandler.getInstance().subscribeToPositions((updates) => {
            setJoints((prev) =>
                prev.map((j) => {
                    const u = updates.find((x) => x.name === j.name);
                    return u ? { ...j, currentValue: u.value, targetValue: u.value } : j;
                })
            );
        });
        return unsubscribe;
    }, [isSending, isConnected, joints.length]);

    // Subscribe to /joint_states — write into a ref at full ROS rate (no re-renders).
    useEffect(() => {
        if (!isConnected || joints.length === 0) return;
        const unsubscribe = JointStateHandler.getInstance().subscribeToJointStates((positions) => {
            for (const { name, value } of positions) {
                actualPositionsRef.current.set(name, value);
            }
        });
        return () => { unsubscribe(); actualPositionsRef.current.clear(); };
    }, [isConnected, joints.length]);

    // Drain actual positions into state at 10 Hz — controls the render budget.
    // Slider aligns to actual once on first feedback; after that only the blue dot updates.
    useEffect(() => {
        if (!isConnected || joints.length === 0) return;
        const interval = setInterval(() => {
            setJoints((prev) => {
                let changed = false;
                const notSending = !isSendingRef.current;
                const next = prev.map((j) => {
                    const actual = actualPositionsRef.current.get(j.name);
                    if (actual === undefined) return j;
                    const isFirstFeedback = j.actualValue === undefined;
                    const actualChanged = isFirstFeedback || Math.abs(actual - j.actualValue!) >= 0.0005;
                    if (!actualChanged) return j;
                    changed = true;
                    return {
                        ...j,
                        actualValue: actual,
                        // First feedback only — align slider once.
                        ...(isFirstFeedback && notSending && { currentValue: actual, targetValue: actual }),
                    };
                });
                return changed ? next : prev;
            });
        }, 100);
        return () => clearInterval(interval);
    }, [isConnected, joints.length]);

    useEffect(() => {
        if (!isSending) {
            return;
        }

        const interval = setInterval(() => {
            JointStateHandler.getInstance().publishJointStates(jointsRef.current);
        }, REFRESH_RATE);

        return () => clearInterval(interval);
    }, [isSending]);

    const handleControlRobotToggle = useCallback((next: boolean) => {
        setIsSending(next);
        setShowControlTakenModal(false);
        if (next) {
            ControlModeHandler.getInstance().takeControl();
        } else {
            ControlModeHandler.getInstance().releaseControl();
        }
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

    const handleTeleopJoint = (y: number, jointName: string) => {
        if (!isSendingRef.current) return;
        setJoints((prevJoints) =>
            prevJoints.map((joint) => {
                const clampedX = Math.max(joint.minValue, y * joint.maxValue);
                if (joint.name === jointName) {
                    return { ...joint, currentValue: clampedX, targetValue: clampedX };
                }
                return joint;
            })
        );
    }

    const handleResetCategory = useCallback((category: string) => {
        setJoints((prevJoints) =>
            prevJoints.map((joint) => {
                if (joint.category === category) {
                    const rest = joint.restValue ?? 0;
                    const clamped = Math.max(joint.minValue, Math.min(joint.maxValue, rest));
                    return { ...joint, currentValue: clamped, targetValue: clamped };
                }
                return joint;
            })
        );
    }, []);

    const handleResetAll = useCallback(() => {
        setJoints((prevJoints) =>
            prevJoints.map((joint) => {
                const rest = joint.restValue ?? 0;
                const clamped = Math.max(joint.minValue, Math.min(joint.maxValue, rest));
                return { ...joint, currentValue: clamped, targetValue: clamped };
            })
        );
    }, []);

    const categorizedJoints = useMemo(() => {
        const categories: { [key: string]: JointControlState[] } = {};
        joints.forEach((joint) => {
            const key = joint.category ?? 'Uncategorized';
            if (!categories[key]) {
                categories[key] = [];
            }
            categories[key].push(joint);
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

    const handleStopAnimation = useCallback(() => {
        if (animationTimeoutRef.current) {
            clearTimeout(animationTimeoutRef.current);
        }
        setIsAnimating(false);
        message.info('Animation stopped');
    }, []);

    const handlePlayAnimation = useCallback(async (animation: SavedAnimation) => {
        if (isAnimating) {
            handleStopAnimation();
        }

        setIsAnimating(true);
        message.success(`Playing animation: "${animation.name}"`);

        const poses = (await Promise.all(
            animation.poseIds.map(id => storageService.loadPose(id))
        )).filter((p): p is SavedPose => p !== null);

        if (poses.length < animation.poseIds.length) {
            message.error('Some poses in the animation could not be found.');
            setIsAnimating(false);
            return;
        }

        let currentIndex = 0;
        const playNextFrame = () => {
            handleLoadPose(poses[currentIndex].joints);
            currentIndex++;

            if (currentIndex >= poses.length) {
                if (animation.loop) {
                    currentIndex = 0;
                } else {
                    setIsAnimating(false);
                    message.success('Animation finished');
                    return;
                }
            }

            animationTimeoutRef.current = setTimeout(
                playNextFrame,
                BASE_ANIMATION_INTERVAL / animation.speed
            );
        };

        playNextFrame();
    }, [isAnimating, handleLoadPose, handleStopAnimation]);

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

    if (isConnected && loading) {
        return (
            <Page contentStyle={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Spin size="large" />
                <Text style={{ color: UI_TEXT_PRIMARY_ON_DARK, marginLeft: 16 }}>
                    Loading robot configuration...
                </Text>
            </Page>
        );
    }

    if (isConnected && error) {
        return (
            <Page>
                <Alert
                    message="Error Loading Robot Configuration"
                    description={error}
                    type="error"
                    showIcon
                    action={
                        <Button size="small" onClick={() => void refetchActiveHardware()}>
                            Retry
                        </Button>
                    }
                />
            </Page>
        );
    }

    return (
        <Page
            showHeader
            title="LUCY CONTROL PANEL"
            contentStyle={{ padding: 12, position: 'relative' }}
            removeScrollbars={false}
        >
            {!isConnected ? (
                <LucyLoader
                    label={isConnecting ? 'CONNECTING TO ROS BRIDGE' : 'WAITING FOR ROS BRIDGE'}
                    detail={
                        isConnecting
                            ? 'Joint controls appear after the connection is established and the active hardware configuration is loaded.'
                            : 'Use Quick Connect in the header to start the link.'
                    }
                    showSpinner={isConnecting}
                />
            ) : (
                <>
                    <Row gutter={[12, 12]} align="middle" justify="space-between" style={{ marginBottom: 12 }}>
                        <Col flex="auto">
                            <Space wrap>
                                <Button
                                    icon={<ReloadOutlined />}
                                    onClick={handleResetAll}
                                    style={{
                                        backgroundColor: UI_COLOR_TRANSPARENT,
                                        borderColor: UI_BORDER_SOFT,
                                        color: UI_TEXT_PRIMARY_ON_DARK,
                                    }}
                                >
                                    RESET ALL
                                </Button>

                                <PoseManager
                                    joints={joints}
                                    onLoadPose={handleLoadPose}
                                />
                                <AnimationManager onPlayAnimation={handlePlayAnimation} />
                                {isAnimating && (
                                    <Button
                                        danger
                                        icon={<StopOutlined />}
                                        onClick={handleStopAnimation}
                                    >
                                        STOP ANIMATION
                                    </Button>
                                )}
                                <Button
                                    onClick={() => setIsStreamVisible(v => !v)}
                                    style={{
                                        backgroundColor: isStreamVisible ? UI_ACCENT_GREEN : UI_COLOR_TRANSPARENT,
                                        color: isStreamVisible ? UI_TEXT_ON_ACCENT : UI_TEXT_PRIMARY_ON_DARK,
                                        borderColor: isStreamVisible ? UI_ACCENT_GREEN : UI_BORDER_SOFT,
                                        boxShadow: isStreamVisible ? UI_ACCENT_BOX_SHADOW_STRONG : 'none',
                                    }}
                                >
                                    {isStreamVisible ? 'HIDE STREAM' : 'SHOW STREAM'}
                                </Button>
                                <Button
                                    onClick={() => setIsWebcamActive(v => !v)}
                                    style={{
                                        backgroundColor: isWebcamActive ? UI_ACCENT_GREEN : UI_COLOR_TRANSPARENT,
                                        color: isWebcamActive ? UI_TEXT_ON_ACCENT : UI_TEXT_PRIMARY_ON_DARK,
                                        borderColor: isWebcamActive ? UI_ACCENT_GREEN : UI_BORDER_SOFT,
                                        boxShadow: isWebcamActive ? UI_ACCENT_BOX_SHADOW_STRONG : 'none',
                                    }}
                                >
                                    {isWebcamActive ? 'HIDE HAND TRACKER' : 'SHOW HAND TRACKER'}
                                </Button>
                            </Space>
                        </Col>

                        <Row gutter={12} align="middle" justify="end" style={{ flex: 'none' }}>
                            <Col>
                                <div style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 4 }}>
                                    <ToggleSwitch
                                        isOn={isSending}
                                        onToggle={handleControlRobotToggle}
                                        title="Control Robot"
                                        rightIcon={<ThunderboltOutlined />}
                                        width={180}
                                        height={32}
                                    />
                                    <Tooltip title="If another connected client turns Control Robot ON, yours will be automatically turned OFF">
                                        <InfoCircleOutlined style={{ color: '#888888', fontSize: 12, cursor: 'help', marginTop: 2 }} />
                                    </Tooltip>
                                </div>
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
                                                disabled={!isSending}
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
                </>
            )}

            <StreamPlayerModal
                isVisible={isStreamVisible}
                onClose={() => setIsStreamVisible(false)}
                initialPosition={{ x: 100, y: 100 }}
            />

            <MovableModal
                modalName="WEBCAM"
                isVisible={isWebcamActive}
                onClose={() => setIsWebcamActive(false)}
                initialPosition={{ x: 400, y: 150 }}
            >
                {isWebcamActive && (
                    <Suspense fallback={<Spin size="large" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }} />}>
                        <MediapipeHandTracker
                            moveRobotIndex={handleTeleopJoint} />
                    </Suspense>
                )}
            </MovableModal>

            {/* Another client took control */}
            {(() => {
                const fighting = retakeCountRef.current >= 3;
                return (
                    <Modal
                        title={
                            <Title level={4} style={{ color: UI_WARNING, margin: 0 }}>
                                <ThunderboltOutlined /> {fighting ? 'Stop fighting!' : 'Someone else took control'}
                            </Title>
                        }
                        open={showControlTakenModal}
                        onCancel={() => { retakeCountRef.current = 0; setShowControlTakenModal(false); }}
                        footer={[
                            <Button
                                key="retake"
                                icon={<ThunderboltOutlined />}
                                onClick={() => {
                                    retakeCountRef.current += 1;
                                    setShowControlTakenModal(false);
                                    handleControlRobotToggle(true);
                                }}
                                style={{
                                    backgroundColor: UI_ACCENT_GREEN,
                                    borderColor: UI_ACCENT_GREEN,
                                    color: UI_TEXT_ON_ACCENT,
                                }}
                            >
                                {fighting ? 'I WILL WIN THIS BATTLE' : 'Retake Control'}
                            </Button>,
                            <Button
                                key="close"
                                onClick={() => {
                                    retakeCountRef.current = 0;
                                    setShowControlTakenModal(false);
                                }}
                                style={{
                                    backgroundColor: UI_COLOR_TRANSPARENT,
                                    borderColor: UI_BORDER_SOFT,
                                    color: UI_TEXT_PRIMARY_ON_DARK,
                                }}
                            >
                                {fighting ? "Let's calm down" : 'Close'}
                            </Button>,
                        ]}
                        style={{ top: 200 }}
                        styles={{ mask: { backgroundColor: UI_MODAL_MASK_BG } }}
                        className="dark-modal"
                    >
                        <Space direction="vertical" style={{ width: '100%' }} size="middle">
                            <Text style={{ color: UI_TEXT_PRIMARY_ON_DARK }}>
                                {fighting
                                    ? 'You and another client keep taking control from each other. Maybe… talk it out?'
                                    : <>Another connected client turned Control Robot <Text style={{ color: UI_ACCENT_GREEN }}>ON</Text> and now has exclusive control.</>
                                }
                            </Text>
                            <Text style={{ color: UI_TEXT_SUBTLE }}>
                                {fighting
                                    ? 'The robot is confused. You should be too.'
                                    : <>Your Control Robot was automatically turned <Text style={{ color: UI_ERROR }}>OFF</Text>. Use <Text style={{ color: UI_ACCENT_GREEN }}>Retake Control</Text> to reclaim it.</>
                                }
                            </Text>
                        </Space>
                    </Modal>
                );
            })()}

        </Page>
    );
};
