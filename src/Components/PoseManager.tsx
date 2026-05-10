import React, { useState, useCallback, useEffect } from 'react';
import {
  Modal,
  Button,
  Input,
  List,
  Space,
  Typography,
  message,
  Popconfirm,
  Card,
  Row,
  Col,
  Tooltip
} from 'antd';
import {
  SaveOutlined,
  FolderOpenOutlined,
  DeleteOutlined,
  DownloadOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import type { JointControlState } from '../Constants/robotTypes';
import {
    UI_ACCENT_GREEN,
    UI_BORDER_MUTED,
    UI_BORDER_SOFT,
    UI_COLOR_TRANSPARENT,
    UI_INPUT_SURFACE,
    UI_LIST_ROW_BG,
    UI_MODAL_MASK_BG,
    UI_PANEL_BG,
    UI_PRIMARY_GREEN_BUTTON_STYLE,
    UI_TEXT_PRIMARY_ON_DARK,
    UI_TEXT_SUBTLE,
} from '../Constants/uiTheme.ts';
import { storageService, type SavedPose } from '../Services/storage.service.ts';

const { Text, Title } = Typography;

interface PoseManagerProps {
  joints: JointControlState[];
  onLoadPose: (joints: Record<string, number>) => void;
}

const PRESET_POSE_NAMES = [
  'Rest Position',
  'Greeting Wave',
  'Handshake Ready',
  'Thinking Pose',
  'Pointing Gesture',
  'Open Arms',
  'Attention Stance',
  'Custom Pose'
];

export const PoseManager: React.FC<PoseManagerProps> = ({ joints, onLoadPose }) => {
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [loadModalVisible, setLoadModalVisible] = useState(false);
  const [poseName, setPoseName] = useState('');
  const [savedPoses, setSavedPoses] = useState<SavedPose[]>([]);
  const [loading, setLoading] = useState(false);
  const [poseCount, setPoseCount] = useState(0);

  const loadSavedPoses = useCallback(async () => {
    try {
      const poses = await storageService.loadPoses();
      setSavedPoses(poses);
      setPoseCount(poses.length);
    } catch (error) {
      message.error('Failed to load saved poses');
      console.error('Error loading poses:', error);
    }
  }, []);

  useEffect(() => {
    loadSavedPoses(); // Load poses on component mount to get count
  }, [loadSavedPoses]);

  useEffect(() => {
    if (loadModalVisible) {
      loadSavedPoses();
    }
  }, [loadModalVisible, loadSavedPoses]);

  const handleSavePose = useCallback(async () => {
    if (!poseName.trim()) {
      message.warning('Please enter a pose name');
      return;
    }

    setLoading(true);
    try {
      const savedPose = await storageService.savePose(poseName.trim(), joints);
      message.success(`Pose "${savedPose.name}" saved successfully`);
      setPoseName('');
      setSaveModalVisible(false);
      await loadSavedPoses(); // Refresh pose count
    } catch (error) {
      message.error('Failed to save pose');
      console.error('Error saving pose:', error);
    } finally {
      setLoading(false);
    }
  }, [poseName, joints, loadSavedPoses]);

  const handleLoadPose = useCallback(async (poseId: string) => {
    setLoading(true);
    try {
      const pose = await storageService.loadPose(poseId);
      if (pose) {
        onLoadPose(pose.joints);
        message.success(`Pose "${pose.name}" loaded successfully`);
        setLoadModalVisible(false);
      } else {
        message.error('Pose not found');
      }
    } catch (error) {
      message.error('Failed to load pose');
      console.error('Error loading pose:', error);
    } finally {
      setLoading(false);
    }
  }, [onLoadPose]);

  const handleDeletePose = useCallback(async (poseId: string, poseName: string) => {
    try {
      await storageService.deletePose(poseId);
      message.success(`Pose "${poseName}" deleted`);
      await loadSavedPoses(); // Refresh the list and count
    } catch (error) {
      message.error('Failed to delete pose');
      console.error('Error deleting pose:', error);
    }
  }, [loadSavedPoses]);

  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  const getJointCount = (joints: Record<string, number>): number => {
    return Object.keys(joints).length;
  };

  return (
    <>
      <Space>
        <Button
          icon={<SaveOutlined />}
          onClick={() => setSaveModalVisible(true)}
          style={{
            backgroundColor: UI_COLOR_TRANSPARENT,
            borderColor: UI_BORDER_SOFT,
            color: UI_TEXT_PRIMARY_ON_DARK
          }}
        >
          SAVE POSE
        </Button>

        <Button
          icon={<FolderOpenOutlined />}
          onClick={() => setLoadModalVisible(true)}
          style={{
            backgroundColor: UI_COLOR_TRANSPARENT,
            borderColor: UI_BORDER_SOFT,
            color: UI_TEXT_PRIMARY_ON_DARK
          }}
        >
          LOAD POSE {poseCount > 0 && <span style={{ color: UI_ACCENT_GREEN }}>({poseCount})</span>}
        </Button>
      </Space>

      {/* Save Pose Modal */}
      <Modal
        title={
          <Title level={4} style={{ color: UI_ACCENT_GREEN, margin: 0 }}>
            <SaveOutlined /> Save Current Pose
          </Title>
        }
        open={saveModalVisible}
        onOk={handleSavePose}
        onCancel={() => {
          setSaveModalVisible(false);
          setPoseName('');
        }}
        confirmLoading={loading}
        okText="Save Pose"
        cancelText="Cancel"
        style={{ top: 100 }}
        styles={{
          mask: { backgroundColor: UI_MODAL_MASK_BG }
        }}
        className="dark-modal"
      >
                <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Text style={{ color: UI_TEXT_PRIMARY_ON_DARK }}>
            Enter a name for your pose. This will save the current position of all {joints.length} joints.
            <br />
            <Text style={{ color: UI_TEXT_SUBTLE, fontSize: '12px' }}>
              You can save multiple poses with different names. Duplicate names will automatically get a number suffix.
            </Text>
          </Text>

          <Input
            placeholder="Enter pose name (e.g., 'Greeting', 'Resting Position')"
            value={poseName}
            onChange={(e) => setPoseName(e.target.value)}
            onPressEnter={handleSavePose}
            maxLength={50}
            autoFocus
            style={{
              backgroundColor: UI_INPUT_SURFACE,
              borderColor: UI_BORDER_SOFT,
              color: UI_TEXT_PRIMARY_ON_DARK
            }}
          />

          <div>
            <Text style={{ color: UI_TEXT_SUBTLE, fontSize: '12px', marginBottom: 8, display: 'block' }}>
              Quick suggestions:
            </Text>
            <Space wrap>
              {PRESET_POSE_NAMES.map((preset) => (
                <Button
                  key={preset}
                  size="small"
                  type="dashed"
                  onClick={() => setPoseName(preset)}
                  style={{
                    borderColor: UI_BORDER_SOFT,
                    color: UI_TEXT_SUBTLE,
                    backgroundColor: UI_COLOR_TRANSPARENT
                  }}
                >
                  {preset}
                </Button>
              ))}
            </Space>
          </div>

          <Card size="small" style={{ backgroundColor: UI_PANEL_BG, borderColor: UI_BORDER_MUTED }}>
            <Row gutter={16}>
              <Col span={12}>
                <Text strong style={{ color: UI_TEXT_PRIMARY_ON_DARK }}>Joints to save:</Text>{' '}
                <Text style={{ color: UI_ACCENT_GREEN }}>{joints.length}</Text>
              </Col>
              <Col span={12}>
                <Text strong style={{ color: UI_TEXT_PRIMARY_ON_DARK }}>Timestamp:</Text>{' '}
                <Text style={{ color: UI_ACCENT_GREEN }}>{formatTimestamp(Date.now())}</Text>
              </Col>
            </Row>
          </Card>
        </Space>
      </Modal>

      {/* Load Pose Modal */}
      <Modal
        title={
          <Title level={4} style={{ color: UI_ACCENT_GREEN, margin: 0 }}>
            <FolderOpenOutlined /> Load Saved Pose
          </Title>
        }
        open={loadModalVisible}
        footer={[
          <Button
            key="close"
            onClick={() => setLoadModalVisible(false)}
            style={{
              backgroundColor: UI_COLOR_TRANSPARENT,
              borderColor: UI_BORDER_SOFT,
              color: UI_TEXT_PRIMARY_ON_DARK,
            }}
          >
            Close
          </Button>
        ]}
        onCancel={() => setLoadModalVisible(false)}
        width={700}
        style={{ top: 50 }}
        styles={{
          mask: { backgroundColor: UI_MODAL_MASK_BG }
        }}
        className="dark-modal"
      >
        {savedPoses.length === 0 ? (
          <Card style={{ textAlign: 'center', backgroundColor: UI_PANEL_BG, borderColor: UI_BORDER_MUTED }}>
            <Text style={{ color: UI_TEXT_SUBTLE }}>
              No saved poses found. Save your first pose to get started!
            </Text>
          </Card>
        ) : (
          <List
            dataSource={savedPoses}
            renderItem={(pose) => (
              <List.Item
                key={pose.id}
                style={{
                  backgroundColor: UI_LIST_ROW_BG,
                  marginBottom: 8,
                  borderRadius: 4,
                  padding: 12,
                  border: `1px solid ${UI_BORDER_MUTED}`
                }}
                actions={[
                  <Tooltip title="Load this pose">
                    <Button
                      type="primary"
                      icon={<DownloadOutlined />}
                      onClick={() => handleLoadPose(pose.id)}
                      loading={loading}
                      style={{ ...UI_PRIMARY_GREEN_BUTTON_STYLE }}
                    >
                      Load
                    </Button>
                  </Tooltip>,
                  <Popconfirm
                    title="Delete this pose?"
                    description={`Are you sure you want to delete "${pose.name}"? This action cannot be undone.`}
                    onConfirm={() => handleDeletePose(pose.id, pose.name)}
                    okText="Delete"
                    cancelText="Cancel"
                    okButtonProps={{ danger: true }}
                  >
                    <Tooltip title="Delete this pose">
                      <Button
                        danger
                        icon={<DeleteOutlined />}
                        type="text"
                      />
                    </Tooltip>
                  </Popconfirm>
                ]}
              >
                <List.Item.Meta
                  title={
                    <Text strong style={{ fontSize: 16, color: UI_ACCENT_GREEN }}>
                      {pose.name}
                    </Text>
                  }
                  description={
                    <Space direction="vertical" size="small">
                      <Space>
                        <ClockCircleOutlined style={{ color: UI_TEXT_SUBTLE }} />
                        <Text style={{ color: UI_TEXT_SUBTLE }}>{formatTimestamp(pose.timestamp)}</Text>
                      </Space>
                      <Text style={{ color: UI_TEXT_SUBTLE }}>
                        {getJointCount(pose.joints)} joints stored
                      </Text>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Modal>
    </>
  );
};
