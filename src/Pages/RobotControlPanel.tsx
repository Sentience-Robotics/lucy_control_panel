/*
 * Copyright 2025-2026 Sentience Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, {
    useState,
    useRef,
    useEffect,
    useCallback,
    useContext,
    useMemo,
    lazy,
    Suspense,
} from 'react';
import { Typography, Space, Button, Alert, Spin, Tooltip, message, Dropdown, Select, Grid } from 'antd';
import type { MenuProps } from 'antd';
import {
    ReloadOutlined,
    ThunderboltOutlined,
    StopOutlined,
    MenuOutlined,
    VideoCameraOutlined,
    EyeOutlined,
    CodeSandboxOutlined,
    ExperimentOutlined,
    SettingOutlined,
} from '@ant-design/icons';

import { JointStateHandler } from "../Services/ros/handlers/JointState.handler";
import { ControlModeHandler } from "../Services/ros/handlers/ControlMode.handler";
import { storageService } from '../Services/storage.service';
import type { SavedAnimation, SavedPose } from '../Services/storage.service';

import { useRosConnection } from "../hooks/useRosConnection.hook";
import { useLiveCameraSources } from '../hooks/useLiveCameraSources.ts';
import { usePersistentBoolean } from '../hooks/usePersistentBoolean.ts';
import { useCloseOnRosDisconnect } from '../hooks/useCloseOnRosDisconnect.ts';
import { useActiveHardwareRos } from '../contexts/ActiveHardwareRosContext';

import { availableDock, useDock } from '../contexts/DockContext.tsx';

import type { JointControlState } from '../Constants/robotTypes';
import {
    DEFAULT_ACTUATOR_MAPPING,
    jointRadToActuatorDeg,
    type ActuatorMapping,
} from '../Utils/actuatorJointMapping';
import { describeClient } from '../Utils/clientIdentity';
import {
    DEFAULT_JOINT_SLIDER_BOUNDS_DEG,
    DEFAULT_JOINT_SLIDER_VALUE_DEG,
} from '../Constants/hardwareConfigDefaults';

import { LucyLoader } from '../Components/LucyLoader';
import { ManagePosesModal } from '../Components/ManagePosesModal';
import { ToggleSwitch } from "../Components/ToggleSwitch";
import { StreamPlayerModal } from "../Components/StreamPlayerModal";
import { Robot3DViewerModal } from "../Components/Robot3DViewerModal";
import { MovableModal } from '../Components/MovableModal';
import { isShowDegreesEnabled } from '../Components/SettingsModal';
import type { ControllerJointConfig } from '../Constants/rosConfig';
import {
    UI_ACCENT_GREEN,
    UI_BORDER_SOFT,
    UI_COLOR_TRANSPARENT,
    UI_ERROR,
    UI_TEXT_ON_ACCENT,
    UI_TEXT_PRIMARY_ON_DARK,
    UI_TEXT_SUBTLE,
    UI_WARNING,
    UI_PANEL_BG,
    UI_BORDER_MUTED,
    UI_BORDER_DIM,
    UI_GRADIENT_MODAL_HEADER,
    UI_MODAL_SURFACE,
    UI_SHADOW_ELEVATED,
    UI_BG_BLACK,
    PAGE_CONTENT_STYLE,
} from '../Constants/uiTheme.ts';
import { HeaderHeightContext } from '../contexts/HeaderHeightContext.ts';
import PaginatedJointCategories from '../Components/ControlPage/PaginatedJointCategories.tsx';
import Robot3DViewer from './Robot3DViewer.tsx';
import SensorDisplay from './SensorDisplay.tsx';
import ResizablePanels from '../Components/ControlPage/ResizablePanels.tsx';
import { Dock } from '../Components/ControlPage/Dock.tsx';
import { StreamPlayer } from '../Components/StreamPlayer.tsx';

const MediapipeHandTracker = lazy(() => import('../Components/MediapipeHandTracker').then(module => ({ default: module.default })));

const { Text } = Typography;
const { useBreakpoint } = Grid;

const REFRESH_RATE = 300;
const BASE_ANIMATION_INTERVAL = 1000;

interface ControlTakenModalProps {
    isVisible: boolean;
    fighting: boolean;
    onClose: () => void;
    onRetake: () => void;
}

const ControlTakenModal: React.FC<ControlTakenModalProps> = ({
    isVisible,
    fighting,
    onClose,
    onRetake,
}) => (
    <MovableModal
        modalName={fighting ? 'STOP FIGHTING' : 'CONTROL TAKEN'}
        isVisible={isVisible}
        onClose={onClose}
        centered
        initialSize={{ w: 560, h: 280 }}
        header={<ThunderboltOutlined style={{ color: UI_WARNING }} />}
        footer={
            <>
                <Button
                    type="primary"
                    icon={<ThunderboltOutlined />}
                    onClick={onRetake}
                    style={{
                        backgroundColor: UI_ACCENT_GREEN,
                        borderColor: UI_ACCENT_GREEN,
                        color: UI_TEXT_ON_ACCENT,
                    }}
                >
                    {fighting ? 'I WILL WIN THIS BATTLE' : 'Retake Control'}
                </Button>
                <Button
                    onClick={onClose}
                    style={{
                        backgroundColor: UI_COLOR_TRANSPARENT,
                        borderColor: UI_BORDER_SOFT,
                        color: UI_TEXT_PRIMARY_ON_DARK,
                    }}
                >
                    {fighting ? "Let's calm down" : 'Close'}
                </Button>
            </>
        }
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
    </MovableModal>
);

export const RobotControlPanel: React.FC = () => {
    const { isConnected, isConnecting } = useRosConnection();
    const { currentDock, setCurrentDock, isDockLoaded } = useDock();

    const {
        controllerConfigsFromActive,
        activeHardwareLoading,
        activeHardwareError,
        refetchActiveHardware,
    } = useActiveHardwareRos();

    const actuatorMappingByJointRef = useRef<Map<string, ActuatorMapping>>(new Map());

    const [joints, setJoints] = useState<JointControlState[]>([]);
    const jointsRef = useRef<JointControlState[]>(joints);
    const actualPositionsRef = useRef<Map<string, number>>(new Map());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showDegrees, setShowDegrees] = useState(isShowDegreesEnabled);
    const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
    const [isSending, setIsSending] = useState(false);
    const isSendingRef = useRef(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const animationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [showControlTakenModal, setShowControlTakenModal] = useState(false);
    const retakeCountRef = useRef(0);
    const [controllerToPreempt, setControllerToPreempt] = useState('');
    const [showConfirmTakeControlModal, setShowConfirmTakeControlModal] = useState(false);

    const screens = useBreakpoint();
    const isMobile = !screens.md;

    const headerHeight = useContext(HeaderHeightContext);

    const [isStreamVisible, setIsStreamVisible] = usePersistentBoolean('lucy_stream_visible');
    const [isVisualizerVisible, setIsVisualizerVisible] = usePersistentBoolean('lucy_visualizer_visible');

    const { hasLiveCamera } = useLiveCameraSources();

    const [isWebcamActive, setIsWebcamActive] = useState<boolean>(false);
    const [webcamAspectRatio, setWebcamAspectRatio] = useState<number | null>(null);
    const [isManagePosesVisible, setIsManagePosesVisible] = useState(false);

    useCloseOnRosDisconnect(isVisualizerVisible, () => setIsVisualizerVisible(false));
    useCloseOnRosDisconnect(isStreamVisible, () => setIsStreamVisible(false));
    useCloseOnRosDisconnect(isWebcamActive, () => setIsWebcamActive(false));

    const isVisualizerDocked = currentDock === '3D_VIEW';
    const isStreamDocked = currentDock === 'STREAM';
    const isTeleoperationDocked = currentDock === 'TELEOPERATION';

    useEffect(() => {
        if (!isDockLoaded) { return; }
        if (isVisualizerDocked) { setIsVisualizerVisible(false); }
        if (isStreamDocked) { setIsStreamVisible(false); }
        if (isTeleoperationDocked) { setIsWebcamActive(false); }
    }, [
        isDockLoaded,
        isVisualizerDocked,
        isStreamDocked,
        isTeleoperationDocked,
        setIsVisualizerVisible,
        setIsStreamVisible,
    ]);
    useCloseOnRosDisconnect(showControlTakenModal, () => {
        retakeCountRef.current = 0;
        setShowControlTakenModal(false);
    });
    useCloseOnRosDisconnect(showConfirmTakeControlModal, () => {
        setControllerToPreempt('');
        setShowConfirmTakeControlModal(false);
    });

    useEffect(() => {
        const handleShowDegreesChange = () => setShowDegrees(isShowDegreesEnabled());
        window.addEventListener('showDegreesChanged', handleShowDegreesChange);
        return () => window.removeEventListener('showDegreesChanged', handleShowDegreesChange);
    }, []);

    const buildJointsFromControllerConfig = useCallback((
        configs: ControllerJointConfig[],
    ): JointControlState[] => {
        const joints: JointControlState[] = [];
        for (const c of configs) {
            for (const name of c.joints) {
                const lim = c.jointLimits?.[name];
                let minValue = DEFAULT_JOINT_SLIDER_BOUNDS_DEG.min;
                let maxValue = DEFAULT_JOINT_SLIDER_BOUNDS_DEG.max;
                let restValue: number | undefined;
                if (lim) {
                    minValue = lim.minDeg;
                    maxValue = lim.maxDeg;
                    restValue = lim.defaultDeg;
                }
                joints.push({
                    name,
                    displayName: c.jointDisplayNames?.[name] ?? name,
                    currentValue: restValue ?? DEFAULT_JOINT_SLIDER_VALUE_DEG,
                    targetValue: restValue ?? DEFAULT_JOINT_SLIDER_VALUE_DEG,
                    minValue,
                    maxValue,
                    type: 'revolute',
                    category: c.defaultCategory,
                    valueInActuatorDegrees: true,
                    ...(restValue !== undefined && { restValue }),
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
        const mapByJoint = new Map<string, ActuatorMapping>();
        for (const c of ctrls) {
            for (const name of c.joints) {
                const lim = c.jointLimits?.[name];
                mapByJoint.set(name, lim?.mapping ?? DEFAULT_ACTUATOR_MAPPING);
            }
        }
        actuatorMappingByJointRef.current = mapByJoint;
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
        const handler = ControlModeHandler.getInstance();
        const unsubscribe = handler.onControllerChanged((controllerId) => {
            if (controllerId === handler.clientId) return;
            if (isSendingRef.current) {
                if (controllerId !== '') {
                    setShowControlTakenModal(true);
                }
                setIsSending(false);
            }
        });
        return unsubscribe;
    }, [isConnected]);

    useEffect(() => {
        if (isSending || !isConnected || joints.length === 0) return;
        const unsubscribe = JointStateHandler.getInstance().subscribeToPositions((updates) => {
            setJoints((prev) =>
                prev.map((j) => {
                    const u = updates.find((x) => x.name === j.name);
                    if (!u) return j;
                    const mapping = actuatorMappingByJointRef.current.get(j.name) ?? DEFAULT_ACTUATOR_MAPPING;
                    const actuatorDeg = jointRadToActuatorDeg(u.value, mapping);
                    return { ...j, currentValue: actuatorDeg, targetValue: actuatorDeg };
                })
            );
        });
        return unsubscribe;
    }, [isSending, isConnected, joints.length]);

    useEffect(() => {
        if (!isConnected || joints.length === 0) return;
        const unsubscribe = JointStateHandler.getInstance().subscribeToJointStates((positions) => {
            for (const { name, value } of positions) {
                const mapping = actuatorMappingByJointRef.current.get(name);
                actualPositionsRef.current.set(
                    name,
                    mapping ? jointRadToActuatorDeg(value, mapping) : value,
                );
            }
        });
        return () => { unsubscribe(); actualPositionsRef.current.clear(); };
    }, [isConnected, joints.length]);

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

    const applyControlToggle = useCallback((shouldControl: boolean) => {
        setIsSending(shouldControl);
        setShowControlTakenModal(false);
        setShowConfirmTakeControlModal(false);
        if (shouldControl) {
            ControlModeHandler.getInstance().takeControl();
        } else {
            ControlModeHandler.getInstance().releaseControl();
        }
    }, []);

    const handleControlRobotToggle = useCallback((shouldControl: boolean) => {
        const handler = ControlModeHandler.getInstance();
        const otherHasControl =
            handler.currentControllerId !== '' && handler.currentControllerId !== handler.clientId;
        if (shouldControl && otherHasControl) {
            setControllerToPreempt(handler.currentControllerId);
            setShowConfirmTakeControlModal(true);
            return;
        }
        applyControlToggle(shouldControl);
    }, [applyControlToggle]);

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

    const handleResetJoint = useCallback((name: string) => {
        setJoints((prevJoints) =>
            prevJoints.map((joint) => {
                if (joint.name === name) {
                    const rest = joint.restValue ?? 0;
                    const clamped = Math.max(joint.minValue, Math.min(joint.maxValue, rest));
                    return { ...joint, currentValue: clamped, targetValue: clamped };
                }
                return joint;
            })
        );
    }, []);

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

    const handleRandomPose = useCallback(() => {
        setJoints((prevJoints) =>
            prevJoints.map((joint) => {
                const value = joint.minValue + Math.random() * (joint.maxValue - joint.minValue);
                return { ...joint, currentValue: value, targetValue: value };
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
        let completedLoops = 0;
        const playNextFrame = () => {
            handleLoadPose(poses[currentIndex].joints);
            currentIndex++;

            if (currentIndex >= poses.length) {
                completedLoops++;
                const hasMoreLoops = animation.loop
                    && (animation.loopCount === 0 || completedLoops < animation.loopCount);
                if (hasMoreLoops) {
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

    if (isConnected && loading) {
        return (
            <>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Spin size="large" />
                    <Text style={{ color: UI_TEXT_PRIMARY_ON_DARK, marginLeft: 16 }}>
                        Loading robot configuration...
                    </Text>
                </div>
                <ControlTakenModal
                    isVisible={showControlTakenModal}
                    fighting={retakeCountRef.current >= 3}
                    onClose={() => {
                        retakeCountRef.current = 0;
                        setShowControlTakenModal(false);
                    }}
                    onRetake={() => {
                        retakeCountRef.current += 1;
                        setShowControlTakenModal(false);
                        applyControlToggle(true);
                    }}
                />
            </>
        );
    }

    if (isConnected && error) {
        return (
            <>
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
                <ControlTakenModal
                    isVisible={showControlTakenModal}
                    fighting={retakeCountRef.current >= 3}
                    onClose={() => {
                        retakeCountRef.current = 0;
                        setShowControlTakenModal(false);
                    }}
                    onRetake={() => {
                        retakeCountRef.current += 1;
                        setShowControlTakenModal(false);
                        applyControlToggle(true);
                    }}
                />
            </>
        );
    }

    const showVisualizerWindow = isVisualizerVisible && !isVisualizerDocked;
    const showStreamWindow = isStreamVisible && !isStreamDocked;
    const isStreamDisabled = isStreamDocked || (!hasLiveCamera && !isStreamVisible);

    const dockContent = (
        <Dock
            childrens={{
                '3D_VIEW': <Robot3DViewer />,
                'STREAM': <StreamPlayer />,
                'TELEOPERATION': (
                    <Suspense fallback={<Spin size="large" />}>
                        <MediapipeHandTracker moveRobotIndex={handleTeleopJoint} />
                    </Suspense>
                ),
                'SENSOR_DISPLAY': <SensorDisplay />,
                'NONE': null,
            }}
            current={currentDock}
        />
    );

    const switches = () => (
        <Tooltip title="If another connected client turns Control Robot ON, yours will be automatically turned OFF">
            <span style={{ display: 'inline-flex', cursor: 'help' }}>
                <ToggleSwitch
                    isOn={isSending}
                    onToggle={handleControlRobotToggle}
                    title="Control Robot"
                    titlePlacement="inline"
                    rightIcon={<ThunderboltOutlined />}
                    width={180}
                />
            </span>
        </Tooltip>
    );

    const items: MenuProps['items'] = [
        {
            key: 'reset',
            label: 'RESET ALL',
            icon: <ReloadOutlined />,
            onClick: handleResetAll,
            disabled: !isSending,
            style: { color: UI_TEXT_PRIMARY_ON_DARK }
        },
        {
            key: 'random-pose',
            label: 'RANDOM POSE',
            icon: <ExperimentOutlined />,
            onClick: handleRandomPose,
            disabled: !isSending,
            style: { color: UI_TEXT_PRIMARY_ON_DARK }
        },
        {
            key: 'poses',
            label: 'MANAGE POSES',
            icon: <SettingOutlined />,
            onClick: () => setIsManagePosesVisible(true),
            style: { color: UI_TEXT_PRIMARY_ON_DARK }
        },
        ...(isAnimating ? [{
            key: 'stop-animation',
            label: 'STOP ANIMATION',
            icon: <StopOutlined />,
            danger: true,
            onClick: handleStopAnimation,
        }] : []),
        {
            type: 'divider' as const,
        },
        {
            key: '3d-view',
            label: showVisualizerWindow ? 'HIDE 3D VIEW' : 'SHOW 3D VIEW',
            icon: <CodeSandboxOutlined />,
            onClick: () => setIsVisualizerVisible(v => !v),
            disabled: isVisualizerDocked,
            title: isVisualizerDocked ? '3D view is currently displayed in the dock' : undefined,
        },
        {
            key: 'stream',
            label: showStreamWindow ? 'HIDE STREAM' : 'SHOW STREAM',
            icon: <VideoCameraOutlined />,
            onClick: () => setIsStreamVisible(v => !v),
            disabled: isStreamDisabled,
            title: isStreamDocked
                ? 'Stream is currently displayed in the dock'
                : 'No camera is publishing',
        },
        {
            key: 'webcam',
            label: isWebcamActive ? 'HIDE HAND TRACKER' : 'SHOW HAND TRACKER',
            icon: <EyeOutlined />,
            onClick: () => setIsWebcamActive(v => !v),
            style: { color: isWebcamActive ? UI_ACCENT_GREEN : UI_TEXT_PRIMARY_ON_DARK }
        },
        ...(isMobile ? [
            {
                key: 'dock',
                label: `DOCK: ${currentDock === 'NONE' ? 'NONE' : currentDock.replace('_', ' ')}`,
                children: availableDock.map(dock => ({
                    key: `dock-${dock}`,
                    label: dock === 'NONE' ? 'NO DOCK' : dock.replace('_', ' '),
                    onClick: () => setCurrentDock(dock),
                })),
            },
            {
                key: 'control-robot',
                label: switches(),
            },
        ] : []),
    ];

    const dropdownOverlayStyle = {
        backgroundColor: UI_PANEL_BG,
        border: `1px solid ${UI_BORDER_MUTED}`,
        borderRadius: 4,
    };

    return (
        <>
            <Robot3DViewerModal
                isVisible={showVisualizerWindow}
                onClose={() => setIsVisualizerVisible(false)}
            />

            <StreamPlayerModal
                isVisible={showStreamWindow}
                onClose={() => setIsStreamVisible(false)}
            />

            <ManagePosesModal
                joints={joints}
                onLoadPose={handleLoadPose}
                onPlayAnimation={handlePlayAnimation}
                isAnimating={isAnimating}
                onStopAnimation={handleStopAnimation}
                isVisible={isManagePosesVisible}
                onVisibleChange={setIsManagePosesVisible}
                showTrigger={false}
            />

            {!isConnected ? (
                <LucyLoader
                    label={isConnecting ? 'CONNECTING TO ROS BRIDGE' : 'WAITING FOR ROS BRIDGE'}
                    connectButton={!isConnecting}
                    detail={
                        isConnecting
                            ? 'Joint controls appear after the connection is established and the active hardware configuration is loaded.'
                            : 'Use Quick Connect in the header to start the link.'
                    }
                    showSpinner={isConnecting}
                />
            ) : (
                <div
                    style={{
                        position: 'relative',
                        isolation: 'isolate',
                        display: 'flex',
                        flexDirection: 'column',
                        height: isMobile
                            ? 'auto'
                            : `calc(100dvh - ${headerHeight}px - ${PAGE_CONTENT_STYLE.padding * 2}px)`,
                        minHeight: isMobile
                            ? `calc(100dvh - ${headerHeight}px - ${PAGE_CONTENT_STYLE.padding * 2}px)`
                            : 0,
                    }}
                >
                    <div
                        style={{
                            position: 'sticky',
                            top: headerHeight,
                            zIndex: 5,
                            backgroundColor: UI_BG_BLACK,
                            borderBottom: `1px solid ${UI_BORDER_MUTED}`,
                            margin: `-${PAGE_CONTENT_STYLE.padding}px -${PAGE_CONTENT_STYLE.padding}px 12px`,
                            padding: PAGE_CONTENT_STYLE.padding,
                            flexShrink: 0,
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 12,
                            }}
                        >
                            <Dropdown
                                menu={{ items }}
                                trigger={['click']}
                                dropdownRender={menu => (
                                    <div style={dropdownOverlayStyle}>{menu}</div>
                                )}
                            >
                                <Button
                                    icon={<MenuOutlined />}
                                    style={{
                                        backgroundColor: UI_COLOR_TRANSPARENT,
                                        borderColor: UI_BORDER_SOFT,
                                        color: UI_TEXT_PRIMARY_ON_DARK,
                                    }}
                                >
                                    Actions
                                </Button>
                            </Dropdown>

                            {!isMobile && <Space wrap>
                                Dock: 
                                <Select
                                    value={currentDock}
                                    onChange={setCurrentDock}
                                    options={availableDock.map((dock) => ({
                                        label: dock === 'NONE'
                                            ? 'No dock'
                                            : dock.replace('_', ' '),
                                        value: dock,
                                    }))}
                                    aria-label="Select dock"
                                    style={{ minWidth: isMobile ? 150 : 180 }}
                                    popupMatchSelectWidth={false}
                                    getPopupContainer={() => document.body}
                                    styles={{
                                        popup: {
                                            root: {
                                                zIndex: 1100,
                                            },
                                        },
                                    }}
                                />
                                {switches()}
                            </Space>}
                        </div>
                    </div>

                    {isMobile && isWebcamActive && (
                        <div
                            style={{
                                position: 'relative',
                                width: '100%',
                                height: '33.333vh',
                                marginBottom: 12,
                                backgroundColor: UI_MODAL_SURFACE,
                                border: `1px solid ${UI_BORDER_MUTED}`,
                                borderRadius: 8,
                                boxShadow: UI_SHADOW_ELEVATED,
                                overflow: 'hidden',
                                flexShrink: 0,
                            }}
                        >
                            <div
                                style={{
                                    height: 36,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '0 8px',
                                    background: UI_GRADIENT_MODAL_HEADER,
                                    borderBottom: `1px solid ${UI_BORDER_DIM}`,
                                }}
                            >
                                <span style={{ color: UI_ACCENT_GREEN, fontFamily: 'monospace', fontSize: 12 }}>
                                    WEBCAM
                                </span>
                                <Button size="small" danger onClick={() => setIsWebcamActive(false)}>
                                    X
                                </Button>
                            </div>
                            <Suspense fallback={<Spin size="large" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }} />}>
                                <MediapipeHandTracker moveRobotIndex={handleTeleopJoint} />
                            </Suspense>
                        </div>
                    )}

                    {isMobile ? (
                        <>
                            {currentDock !== 'NONE' && (
                                <div
                                    style={{
                                        width: '100%',
                                        height: '40vh',
                                        minHeight: 240,
                                        marginBottom: 12,
                                        flexShrink: 0,
                                        overflow: 'hidden',
                                    }}
                                >
                                    {dockContent}
                                </div>
                            )}
                            <div style={{ width: '100%', minHeight: 0 }}>
                                <PaginatedJointCategories
                                    categoryOrder={categoryOrder}
                                    categorizedJoints={categorizedJoints}
                                    onJointValueChange={handleJointValueChange}
                                    onResetCategory={handleResetCategory}
                                    onResetJoint={handleResetJoint}
                                    showDegrees={showDegrees}
                                    disabled={!isSending}
                                />
                            </div>
                        </>
                    ) : (
                        <div
                            style={{
                                width: '100%',
                                flex: 1,
                                minHeight: 0,
                                overflow: 'hidden',
                            }}
                        >
                            <ResizablePanels
                                direction="horizontal"
                                proportions={currentDock === "NONE" ? [100] : [30, 70]}
                                minSize={25}
                                gap={20}
                            >
                                <PaginatedJointCategories
                                    categoryOrder={categoryOrder}
                                    categorizedJoints={categorizedJoints}
                                    onJointValueChange={handleJointValueChange}
                                    onResetCategory={handleResetCategory}
                                    onResetJoint={handleResetJoint}
                                    showDegrees={showDegrees}
                                    disabled={!isSending}
                                />

                                {currentDock !== "NONE" && dockContent}
                            </ResizablePanels>
                        </div>
                    )}
                </div>
            )}

            {!isMobile && (
                <MovableModal
                    modalName="WEBCAM"
                    isVisible={isWebcamActive}
                    onClose={() => setIsWebcamActive(false)}
                    initialPosition={{ x: 400, y: 150 }}
                    initialSize={{ w: 480, h: 400 }}
                    contentPadding={0}
                    contentAspectRatio={webcamAspectRatio}
                >
                    {isWebcamActive && (
                        <Suspense fallback={<Spin size="large" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }} />}>
                            <MediapipeHandTracker
                                moveRobotIndex={handleTeleopJoint}
                                onAspectRatioChange={setWebcamAspectRatio} />
                        </Suspense>
                    )}
                </MovableModal>
            )}

            <ControlTakenModal
                isVisible={showControlTakenModal}
                fighting={retakeCountRef.current >= 3}
                onClose={() => {
                    retakeCountRef.current = 0;
                    setShowControlTakenModal(false);
                }}
                onRetake={() => {
                    retakeCountRef.current += 1;
                    setShowControlTakenModal(false);
                    applyControlToggle(true);
                }}
            />

            <MovableModal
                modalName="TAKE CONTROL FROM ANOTHER CLIENT?"
                isVisible={showConfirmTakeControlModal}
                onClose={() => setShowConfirmTakeControlModal(false)}
                centered
                initialSize={{ w: 500, h: 300 }}
                header={<ThunderboltOutlined style={{ color: UI_WARNING }} />}
                footer={[
                    <Button
                        key="take"
                        type="primary"
                        icon={<ThunderboltOutlined />}
                        onClick={() => applyControlToggle(true)}
                        style={{
                            backgroundColor: UI_ACCENT_GREEN,
                            borderColor: UI_ACCENT_GREEN,
                            color: UI_TEXT_ON_ACCENT,
                        }}
                    >
                        Take Control Anyway
                    </Button>,
                    <Button
                        key="cancel"
                        onClick={() => setShowConfirmTakeControlModal(false)}
                        style={{
                            backgroundColor: UI_COLOR_TRANSPARENT,
                            borderColor: UI_BORDER_SOFT,
                            color: UI_TEXT_PRIMARY_ON_DARK,
                        }}
                    >
                        Cancel
                    </Button>,
                ]}
            >
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <Text style={{ color: UI_TEXT_PRIMARY_ON_DARK }}>
                        The robot is currently controlled by {describeClient(controllerToPreempt)}.
                    </Text>
                    <Text style={{ color: UI_TEXT_SUBTLE }}>
                        Control is exclusive: their Control Robot switches to <Text style={{ color: UI_ERROR }}>OFF</Text> immediately,
                        and they are told you took over.
                    </Text>
                </Space>
            </MovableModal>

        </>
    );
};
