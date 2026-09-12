/*
 * Copyright 2025-2026 Sentience Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Button,
    Card,
    Divider,
    Empty,
    Input,
    InputNumber,
    List,
    Modal,
    Pagination,
    Popconfirm,
    Select,
    Space,
    Tag,
    Tooltip,
    Typography,
    message,
} from 'antd';
import {
    DeleteOutlined,
    DownOutlined,
    FolderOpenOutlined,
    PlayCircleOutlined,
    PlusOutlined,
    SaveOutlined,
    SettingOutlined,
    UpOutlined,
} from '@ant-design/icons';
import type { JointControlState } from '../Constants/robotTypes';
import {
    UI_ACCENT_GREEN,
    UI_BORDER_MUTED,
    UI_BORDER_SOFT,
    UI_COLOR_TRANSPARENT,
    UI_INPUT_SURFACE,
    UI_LIST_ROW_BG,
    UI_PANEL_BG,
    UI_PRIMARY_GREEN_BUTTON_STYLE,
    UI_TEXT_ON_ACCENT,
    UI_TEXT_PRIMARY_ON_DARK,
    UI_TEXT_SUBTLE,
} from '../Constants/uiTheme.ts';
import {
    PoseInUseError,
    storageService,
    type SavedAnimation,
    type SavedPose,
} from '../Services/storage.service.ts';
import { MovableModal } from './MovableModal';
import { ToggleSwitch } from './ToggleSwitch';

const { Text, Title } = Typography;

interface ManagePosesModalProps {
    joints: JointControlState[];
    onLoadPose: (joints: Record<string, number>) => void;
    onPlayAnimation: (animation: SavedAnimation) => void;
    isAnimating: boolean;
    onStopAnimation: () => void;
}

const formatDate = (value: number | string) => new Date(value).toLocaleString();

export const ManagePosesModal: React.FC<ManagePosesModalProps> = ({
    joints,
    onLoadPose,
    onPlayAnimation,
    isAnimating,
    onStopAnimation,
}) => {
    const [visible, setVisible] = useState(false);
    const [poseName, setPoseName] = useState('');
    const [poses, setPoses] = useState<SavedPose[]>([]);
    const [poseSearch, setPoseSearch] = useState('');
    const [posePage, setPosePage] = useState(1);
    const [poseNames, setPoseNames] = useState<Record<string, string>>({});
    const [animations, setAnimations] = useState<SavedAnimation[]>([]);
    const [selectedAnimationId, setSelectedAnimationId] = useState<string | null>(null);
    const [animationName, setAnimationName] = useState('');
    const [sequence, setSequence] = useState<string[]>([]);
    const [speed, setSpeed] = useState(1);
    const [loop, setLoop] = useState(true);
    const [loopCount, setLoopCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const filteredPoses = useMemo(() => {
        const query = poseSearch.trim().toLocaleLowerCase();
        if (!query) return poses;
        return poses.filter(pose => (poseNames[pose.id] ?? pose.name).toLocaleLowerCase().includes(query));
    }, [poseNames, poseSearch, poses]);
    const paginatedPoses = filteredPoses.slice((posePage - 1) * 5, posePage * 5);

    const loadData = useCallback(async () => {
        const [loadedPoses, loadedAnimations] = await Promise.all([
            storageService.loadPoses(),
            storageService.loadAnimations(),
        ]);
        setPoses(loadedPoses);
        setPoseNames(Object.fromEntries(loadedPoses.map(pose => [pose.id, pose.name])));
        setAnimations(loadedAnimations);
    }, []);

    useEffect(() => {
        if (visible) void loadData();
    }, [loadData, visible]);

    useEffect(() => {
        setPosePage(1);
    }, [poseSearch]);

    useEffect(() => {
        const pageCount = Math.max(1, Math.ceil(filteredPoses.length / 5));
        setPosePage(current => Math.min(current, pageCount));
    }, [filteredPoses.length]);

    const resetAnimationEditor = () => {
        setSelectedAnimationId(null);
        setAnimationName('');
        setSequence([]);
        setSpeed(1);
        setLoop(true);
        setLoopCount(0);
    };

    const selectAnimation = (id: string | null) => {
        setSelectedAnimationId(id);
        if (!id) {
            resetAnimationEditor();
            return;
        }
        const animation = animations.find(item => item.id === id);
        if (!animation) return;
        setAnimationName(animation.name);
        setSequence(animation.poseIds);
        setSpeed(animation.speed);
        setLoop(animation.loop);
        setLoopCount(animation.loopCount ?? 0);
    };

    const handleSavePose = async () => {
        if (isAnimating) {
            message.info('Stop the animation before saving a pose');
            return;
        }
        if (!poseName.trim()) {
            message.warning('Please enter a pose name');
            return;
        }
        setLoading(true);
        try {
            await storageService.savePose(poseName.trim(), joints);
            setPoseName('');
            await loadData();
            message.success('Pose saved');
        } catch (error) {
            message.error('Failed to save pose');
            console.error('Error saving pose:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLoadPose = async (id: string) => {
        setLoading(true);
        try {
            if (isAnimating) onStopAnimation();
            const pose = await storageService.loadPose(id);
            if (!pose) {
                message.error('Pose not found');
                return;
            }
            onLoadPose(pose.joints);
            message.success(`Pose "${pose.name}" loaded`);
        } catch (error) {
            message.error('Failed to load pose');
            console.error('Error loading pose:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRenamePose = async (id: string) => {
        const name = poseNames[id] ?? '';
        const pose = poses.find(item => item.id === id);
        if (!pose || name.trim() === pose.name) return;
        if (!name.trim()) {
            setPoseNames(current => ({ ...current, [id]: pose.name }));
            message.warning('Please enter a pose name');
            return;
        }

        try {
            const renamedPose = await storageService.renamePose(id, name);
            setPoses(current => current.map(item => item.id === id ? renamedPose : item));
            setPoseNames(current => ({ ...current, [id]: renamedPose.name }));
            if (renamedPose.name !== name.trim()) {
                message.info(`Pose renamed to "${renamedPose.name}" to avoid a duplicate name`);
            }
        } catch (error) {
            message.error('Failed to rename pose');
            console.error('Error renaming pose:', error);
            setPoseNames(current => ({ ...current, [id]: pose.name }));
        }
    };

    const deletePose = async (id: string, name: string, force = false) => {
        try {
            await storageService.deletePose(id, force);
            await loadData();
            message.success(force ? `Pose "${name}" and linked animations deleted` : `Pose "${name}" deleted`);
        } catch (error) {
            if (error instanceof PoseInUseError) {
                Modal.confirm({
                    title: 'Pose is used by an animation',
                    content: (
                        <div>
                            <p>This pose is linked to:</p>
                            <ul>{error.animationNames.map(animation => <li key={animation}>{animation}</li>)}</ul>
                            <p>Delete the pose and those animations?</p>
                        </div>
                    ),
                    okText: 'Delete all',
                    okType: 'danger',
                    onOk: () => deletePose(id, name, true),
                });
            } else {
                message.error('Failed to delete pose');
                console.error('Error deleting pose:', error);
            }
        }
    };

    const addPoseToSequence = (id: string) => {
        if (sequence.at(-1) === id) {
            message.warning('The same pose cannot be chained twice in a row');
            return;
        }
        setSequence(current => [...current, id]);
    };

    const movePoseInSequence = (index: number, direction: -1 | 1) => {
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= sequence.length) return;
        const next = [...sequence];
        [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
        if (next.some((id, itemIndex) => itemIndex > 0 && id === next[itemIndex - 1])) {
            message.warning('The same pose cannot be chained twice in a row');
            return;
        }
        setSequence(next);
    };

    const saveAnimation = async () => {
        if (!animationName.trim()) {
            message.warning('Please enter an animation name');
            return;
        }
        if (sequence.length < 2) {
            message.warning('An animation requires at least two poses');
            return;
        }
        setLoading(true);
        try {
            await storageService.saveAnimation({
                id: selectedAnimationId ?? undefined,
                name: animationName.trim(),
                poseIds: sequence,
                speed,
                loop,
                loopCount: loop ? loopCount : 0,
            });
            await loadData();
            resetAnimationEditor();
            message.success(selectedAnimationId ? 'Animation updated' : 'Animation created');
        } catch (error) {
            message.error('Failed to save animation');
            console.error('Error saving animation:', error);
        } finally {
            setLoading(false);
        }
    };

    const animationValidationError = !animationName.trim()
        ? 'Enter an animation name'
        : sequence.length < 2
            ? 'Add at least two frames'
            : null;

    const deleteAnimation = async () => {
        if (!selectedAnimationId) return;
        try {
            await storageService.deleteAnimation(selectedAnimationId);
            await loadData();
            resetAnimationEditor();
            message.success('Animation deleted');
        } catch (error) {
            message.error('Failed to delete animation');
            console.error('Error deleting animation:', error);
        }
    };

    return (
        <>
            <Button
                icon={<SettingOutlined />}
                onClick={() => setVisible(true)}
                style={{
                    backgroundColor: UI_COLOR_TRANSPARENT,
                    borderColor: UI_BORDER_SOFT,
                    color: UI_TEXT_PRIMARY_ON_DARK,
                }}
            >
                MANAGE POSES {poses.length > 0 && <span style={{ color: UI_ACCENT_GREEN }}>({poses.length})</span>}
            </Button>
            <MovableModal
                modalName="MANAGE POSES"
                isVisible={visible}
                onClose={() => setVisible(false)}
                initialPosition={{ x: 120, y: 100 }}
                initialSize={{ w: 720, h: 700 }}
                header={<SettingOutlined style={{ color: UI_ACCENT_GREEN }} />}
                footer={<Button onClick={() => setVisible(false)}>CLOSE</Button>}
            >
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    <section>
                        <Title level={4} style={{ color: UI_ACCENT_GREEN, marginTop: 0 }}>Save</Title>
                        <Space.Compact style={{ width: '100%' }}>
                            <Input
                                value={poseName}
                                maxLength={50}
                                placeholder="Pose name"
                                onChange={event => setPoseName(event.target.value)}
                                onPressEnter={() => void handleSavePose()}
                                style={{ backgroundColor: UI_INPUT_SURFACE, color: UI_TEXT_PRIMARY_ON_DARK }}
                            />
                            <Button
                                type="primary"
                                icon={<SaveOutlined />}
                                loading={loading}
                                disabled={isAnimating || !poseName.trim()}
                                onClick={() => void handleSavePose()}
                                style={UI_PRIMARY_GREEN_BUTTON_STYLE}
                            >
                                SAVE POSE
                            </Button>
                        </Space.Compact>
                        <Text type="secondary" style={{ display: 'block', marginTop: 6 }}>{joints.length} joints will be stored with the pose.</Text>
                    </section>

                    <Divider style={{ borderColor: UI_BORDER_MUTED, margin: 0 }} />

                    <section>
                        <Title level={4} style={{ color: UI_ACCENT_GREEN, marginTop: 0 }}>Load</Title>
                        {poses.length === 0 ? <Empty description="No saved poses yet" /> : (
                            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                                <Input.Search
                                    value={poseSearch}
                                    allowClear
                                    placeholder="Search saved poses"
                                    onChange={event => setPoseSearch(event.target.value)}
                                />
                                {filteredPoses.length === 0 ? <Empty description="No matching poses" /> : (
                                    <>
                                        <List
                                            dataSource={paginatedPoses}
                                            renderItem={pose => (
                                                <List.Item
                                                    style={{ backgroundColor: UI_LIST_ROW_BG, border: `1px solid ${UI_BORDER_MUTED}`, padding: 12 }}
                                                    actions={[
                                                        <Button
                                                            key="load"
                                                            type="primary"
                                                            icon={<FolderOpenOutlined />}
                                                            loading={loading}
                                                            onClick={() => void handleLoadPose(pose.id)}
                                                            style={{ ...UI_PRIMARY_GREEN_BUTTON_STYLE, color: UI_TEXT_ON_ACCENT }}
                                                        >
                                                            LOAD
                                                        </Button>,
                                                        <Popconfirm key="delete" title={`Delete "${pose.name}"?`} onConfirm={() => void deletePose(pose.id, pose.name)} okButtonProps={{ danger: true }}>
                                                            <Button danger type="text" icon={<DeleteOutlined />} />
                                                        </Popconfirm>,
                                                    ]}
                                                >
                                                    <List.Item.Meta
                                                        title={(
                                                            <Input
                                                                value={poseNames[pose.id] ?? pose.name}
                                                                maxLength={50}
                                                                onChange={event => setPoseNames(current => ({ ...current, [pose.id]: event.target.value }))}
                                                                onBlur={() => void handleRenamePose(pose.id)}
                                                                onPressEnter={event => {
                                                                    event.currentTarget.blur();
                                                                }}
                                                                aria-label={`Rename pose ${pose.name}`}
                                                            />
                                                        )}
                                                        description={<Text style={{ color: UI_TEXT_SUBTLE }}>{formatDate(pose.date ?? pose.timestamp)} - {Object.keys(pose.joints).length} joints</Text>}
                                                    />
                                                </List.Item>
                                            )}
                                        />
                                        <Pagination
                                            current={posePage}
                                            pageSize={5}
                                            total={filteredPoses.length}
                                            showSizeChanger={false}
                                            onChange={setPosePage}
                                            hideOnSinglePage
                                        />
                                    </>
                                )}
                            </Space>
                        )}
                    </section>

                    <Divider style={{ borderColor: UI_BORDER_MUTED, margin: 0 }} />

                    <section>
                        <Title level={4} style={{ color: UI_ACCENT_GREEN, marginTop: 0 }}>Animations</Title>
                        {poses.length < 2 ? (
                            <Card style={{ backgroundColor: UI_PANEL_BG, borderColor: UI_BORDER_MUTED }}>
                                <Text style={{ color: UI_TEXT_SUBTLE }}>Save at least two poses to create an animation.</Text>
                            </Card>
                        ) : (
                            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                                <Space wrap style={{ width: '100%' }}>
                                    {animations.length > 0 && (
                                        <Button
                                            type="default"
                                            disabled={selectedAnimationId === null}
                                            onClick={resetAnimationEditor}
                                        >
                                            CREATE NEW ANIMATION
                                        </Button>
                                    )}
                                    {animations.length > 0 && (
                                        <Select
                                            value={selectedAnimationId ?? undefined}
                                            placeholder="Select animation to edit"
                                            onChange={selectAnimation}
                                            style={{ minWidth: 240 }}
                                            options={animations.map(animation => ({ label: animation.name, value: animation.id }))}
                                        />
                                    )}
                                </Space>
                                <Input
                                    value={animationName}
                                    placeholder="Animation name"
                                    onChange={event => setAnimationName(event.target.value)}
                                />
                                <div>
                                    <Text style={{ color: UI_TEXT_PRIMARY_ON_DARK }}>Pose sequence</Text>
                                    <List
                                        size="small"
                                        dataSource={sequence}
                                        locale={{ emptyText: 'Add poses below to build the sequence' }}
                                        renderItem={(id, index) => {
                                            const pose = poses.find(item => item.id === id);
                                            return (
                                                <List.Item
                                                    actions={[
                                                        <Tooltip title="Move up" key="up"><Button type="text" icon={<UpOutlined />} disabled={index === 0} onClick={() => movePoseInSequence(index, -1)} /></Tooltip>,
                                                        <Tooltip title="Move down" key="down"><Button type="text" icon={<DownOutlined />} disabled={index === sequence.length - 1} onClick={() => movePoseInSequence(index, 1)} /></Tooltip>,
                                                        <Button type="text" danger icon={<DeleteOutlined />} key="remove" onClick={() => setSequence(current => current.filter((_, itemIndex) => itemIndex !== index))} />,
                                                    ]}
                                                >
                                                    <Tag color="green">{index + 1}</Tag>
                                                    <Text style={{ color: UI_TEXT_PRIMARY_ON_DARK }}>{pose?.name ?? 'Missing pose'}</Text>
                                                </List.Item>
                                            );
                                        }}
                                    />
                                    <Space wrap style={{ marginTop: 8 }}>
                                        {poses.map(pose => (
                                            <Tooltip
                                                key={pose.id}
                                                title={sequence.at(-1) === pose.id ? 'Blocked: the same pose cannot be put twice in a row' : 'Add pose to sequence'}
                                            >
                                                <span>
                                                    <Button
                                                        size="small"
                                                        icon={<PlusOutlined />}
                                                        disabled={sequence.at(-1) === pose.id}
                                                        onClick={() => addPoseToSequence(pose.id)}
                                                        style={sequence.at(-1) === pose.id ? { color: UI_TEXT_SUBTLE, borderColor: UI_BORDER_MUTED } : undefined}
                                                    >
                                                        {pose.name}
                                                    </Button>
                                                </span>
                                            </Tooltip>
                                        ))}
                                    </Space>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 1fr) minmax(180px, 1.5fr)', gap: 12, alignItems: 'center' }}>
                                    <Text style={{ color: UI_TEXT_PRIMARY_ON_DARK }}>Animation speed</Text>
                                    <InputNumber min={0.1} max={10} step={0.1} value={speed} onChange={value => setSpeed(value ?? 1)} style={{ width: '100%' }} />
                                    <Text style={{ color: UI_TEXT_PRIMARY_ON_DARK }}>Loop playback</Text>
                                    <ToggleSwitch title="Loop" titlePlacement="inline" isOn={loop} onToggle={setLoop} textOn="ON" textOff="OFF" width={150} />
                                    <Text style={{ color: UI_TEXT_PRIMARY_ON_DARK }}>Loop count</Text>
                                    <InputNumber min={0} max={999} value={loopCount} disabled={!loop} onChange={value => setLoopCount(value ?? 0)} addonAfter="0 = infinite" style={{ width: '100%' }} />
                                </div>
                                {animationValidationError && (
                                    <Text type="danger">{animationValidationError}</Text>
                                )}
                                <Space wrap>
                                    <Button
                                        type="primary"
                                        loading={loading}
                                        disabled={Boolean(animationValidationError)}
                                        onClick={() => void saveAnimation()}
                                        style={UI_PRIMARY_GREEN_BUTTON_STYLE}
                                    >
                                        {selectedAnimationId ? 'UPDATE ANIMATION' : 'CREATE ANIMATION'}
                                    </Button>
                                    {selectedAnimationId && <Button icon={<PlayCircleOutlined />} onClick={() => { const animation = animations.find(item => item.id === selectedAnimationId); if (animation) onPlayAnimation(animation); }}>PLAY</Button>}
                                    {selectedAnimationId && <Popconfirm title="Delete this animation?" onConfirm={() => void deleteAnimation()}><Button danger icon={<DeleteOutlined />}>DELETE</Button></Popconfirm>}
                                </Space>
                            </Space>
                        )}
                    </section>
                </Space>
            </MovableModal>
        </>
    );
};
