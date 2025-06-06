import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Typography,
  Space,
  Button,
  Statistic,
  Row,
  Col,
  Alert,
  Spin
} from 'antd';
import {
  ReloadOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined
} from '@ant-design/icons';
import {
  DndContext,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy
} from '@dnd-kit/sortable';
import { UrdfParser } from '../Utils/urdfParser';
import type { JointControlState } from '../Constants/robotTypes';
import { RobotPathResolver } from '../Constants/robotConfig';
import { JointCategory } from '../Components/JointCategory';
import { DraggableCategory } from '../Components/DraggableCategory';
import { PoseManager } from '../Components/PoseManager';
import { Page } from '../Components/Page';

const { Text } = Typography;

export const RobotControlPanel: React.FC = () => {
  const [joints, setJoints] = useState<JointControlState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDegrees, setShowDegrees] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [categoryOrder, setCategoryOrder] = useState<string[]>([
    'Head', 'Torso', 'Left Arm', 'Right Arm', 'Left Hand', 'Right Hand', 'Base'
  ]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadUrdfData();
  }, []);

  const loadUrdfData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch the URDF file from the public directory
      const response = await fetch(RobotPathResolver.getUrdfPath());
      if (!response.ok) {
        throw new Error('Failed to load URDF file');
      }

      const urdfContent = await response.text();
      const parser = new UrdfParser(urdfContent);
      const parsedJoints = parser.parseJoints();
      const controlStates = UrdfParser.createJointControlStates(parsedJoints);

      setJoints(controlStates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load robot configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleJointValueChange = useCallback((name: string, value: number) => {
    setJoints(prevJoints =>
      prevJoints.map(joint =>
        joint.name === name
          ? { ...joint, currentValue: value, targetValue: value }
          : joint
      )
    );
  }, []);

  const handleResetCategory = useCallback((category: string) => {
    setJoints(prevJoints =>
      prevJoints.map(joint => {
        if (joint.category === category) {
          const midValue = (joint.minValue + joint.maxValue) / 2;
          return { ...joint, currentValue: midValue, targetValue: midValue };
        }
        return joint;
      })
    );
  }, []);

  const handleResetAll = useCallback(() => {
    setJoints(prevJoints =>
      prevJoints.map(joint => {
        const midValue = (joint.minValue + joint.maxValue) / 2;
        return { ...joint, currentValue: midValue, targetValue: midValue };
      })
    );
  }, []);

  const categorizedJoints = useMemo(() => {
    const categories: { [key: string]: JointControlState[] } = {};
    joints.forEach(joint => {
      if (!categories[joint.category]) {
        categories[joint.category] = [];
      }
      categories[joint.category].push(joint);
    });
    return categories;
  }, [joints]);

  const handleLoadPose = useCallback((poseJoints: Record<string, number>, categoryOrder?: string[]) => {
    setJoints(prevJoints =>
      prevJoints.map(joint => ({
        ...joint,
        currentValue: poseJoints[joint.name] ?? joint.currentValue,
        targetValue: poseJoints[joint.name] ?? joint.targetValue
      }))
    );

    // Restore category order if provided
    if (categoryOrder) {
      setCategoryOrder(categoryOrder);
    }
  }, []);

  const toggleConnection = useCallback(() => { // TODO: Implement connection logic
    setIsConnected(!isConnected);
  }, [isConnected]);

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
              fontWeight: 'bold'
            }}
          >
            ▲ LUCY CONTROL PANEL
          </Text>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: 0,
              backgroundColor: isConnected ? '#00ff41' : '#ff4d4f',
              boxShadow: `0 0 8px ${isConnected ? '#00ff41' : '#ff4d4f'}`,
              animation: isConnected ? 'pulse 2s infinite' : 'none'
            }}
          />
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
      contentStyle={{ padding: 12 }}
    >
          <Row gutter={[8, 8]} style={{ marginBottom: 12 }}>
            <Col>
              <Space>
                <Button
                  type="primary"
                  icon={isConnected ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                  onClick={toggleConnection}
                  style={{
                    backgroundColor: isConnected ? '#ff4d4f' : '#00ff41',
                    borderColor: isConnected ? '#ff4d4f' : '#00ff41',
                    color: '#000',
                    fontWeight: 'bold'
                  }}
                >
                  {isConnected ? 'DISCONNECT' : 'CONNECT'}
                </Button>

                <Button
                  icon={<ReloadOutlined />}
                  onClick={handleResetAll}
                  style={{
                    backgroundColor: 'transparent',
                    borderColor: '#444',
                    color: '#fff'
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
              <Space align="center">
                <Text style={{ color: '#fff', fontFamily: 'monospace' }}>UNIT:</Text>
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
                    onClick={() => setShowDegrees(false)}
                    style={{
                      padding: '4px 12px',
                      border: 'none',
                      backgroundColor: !showDegrees ? '#00ff41' : 'transparent',
                      color: !showDegrees ? '#000' : '#666',
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    RAD
                  </button>
                  <div style={{ width: '1px', backgroundColor: '#444' }} />
                  <button
                    onClick={() => setShowDegrees(true)}
                    style={{
                      padding: '4px 12px',
                      border: 'none',
                      backgroundColor: showDegrees ? '#00ff41' : 'transparent',
                      color: showDegrees ? '#000' : '#666',
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    DEG
                  </button>
                </div>
              </Space>
            </Col>
          </Row>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <DndContext
              sensors={sensors}
              collisionDetection={rectIntersection}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={categoryOrder} strategy={rectSortingStrategy}>
                <div
                  style={{
                    columnCount: 'auto',
                    columnWidth: '320px',
                    columnGap: '12px',
                    width: '100%'
                  }}
                >
                  {categoryOrder.map(category => {
                    if (!categorizedJoints[category] || categorizedJoints[category].length === 0) {
                      return null;
                    }

                    return (
                      <div
                        key={category}
                        style={{
                          breakInside: 'avoid',
                          pageBreakInside: 'avoid',
                          marginBottom: '8px',
                          display: 'inline-block',
                          width: '100%'
                        }}
                      >
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
                      onJointValueChange={() => {}}
                      onResetCategory={() => {}}
                      showDegrees={showDegrees}
                    />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        </Page>
  );
};
