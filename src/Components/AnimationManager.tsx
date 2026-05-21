import React, { useState, useCallback, useEffect } from 'react';
import {
  Modal,
  Button,
  Input,
  Space,
  Typography,
  message,
  Select,
  Switch,
  InputNumber,
  Popconfirm
} from 'antd';
import {
  SettingOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { storageService, type SavedPose, type SavedAnimation } from '../Services/storage.service.ts';
import {
    UI_ACCENT_GREEN,
    UI_BORDER_SOFT,
    UI_COLOR_TRANSPARENT,
    UI_INPUT_SURFACE,
    UI_MODAL_MASK_BG,
    UI_TEXT_PRIMARY_ON_DARK,
} from '../Constants/uiTheme.ts';

const { Text, Title } = Typography;
const { Option } = Select;

interface AnimationManagerProps {
  onPlayAnimation: (animation: SavedAnimation) => void;
}

export const AnimationManager: React.FC<AnimationManagerProps> = ({ onPlayAnimation }) => {
  const [manageModalVisible, setManageModalVisible] = useState(false);
  
  const [animations, setAnimations] = useState<SavedAnimation[]>([]);
  const [savedPoses, setSavedPoses] = useState<SavedPose[]>([]);
  
  const [editingAnimId, setEditingAnimId] = useState<string | null>(null);
  const [animName, setAnimName] = useState('');
  const [selectedPoseIds, setSelectedPoseIds] = useState<string[]>([]);
  const [speed, setSpeed] = useState<number>(1);
  const [loop, setLoop] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [loadedAnimations, loadedPoses] = await Promise.all([
        storageService.loadAnimations(),
        storageService.loadPoses()
      ]);
      setAnimations(loadedAnimations);
      setSavedPoses(loadedPoses);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleOpenManageModal = async () => {
    await loadData();
    setManageModalVisible(true);
    setEditingAnimId(null);
    setAnimName('');
    setSelectedPoseIds([]);
    setSpeed(1);
    setLoop(false);
  };

  const handleSelectAnimationToEdit = (id: string | null) => {
      setEditingAnimId(id);
      if (id) {
          const anim = animations.find(a => a.id === id);
          if (anim) {
              setAnimName(anim.name);
              setSelectedPoseIds(anim.poseIds);
              setSpeed(anim.speed);
              setLoop(anim.loop);
          }
      } else {
          setAnimName('');
          setSelectedPoseIds([]);
          setSpeed(1);
          setLoop(false);
      }
  };

  const handleSaveAnimation = async () => {
    if (!animName.trim()) {
      message.warning('Please enter an animation name');
      return;
    }
    if (selectedPoseIds.length < 2) {
      message.warning('An animation requires at least two poses');
      return;
    }

    setLoading(true);
    try {
      await storageService.saveAnimation({
        id: editingAnimId || undefined,
        name: animName.trim(),
        poseIds: selectedPoseIds,
        speed,
        loop
      });
      message.success(editingAnimId ? 'Animation updated successfully' : 'Animation saved successfully');
      setManageModalVisible(false);
      await loadData();
    } catch (error) {
      message.error('Failed to save animation');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAnimation = async () => {
      if (!editingAnimId) return;
      try {
          await storageService.deleteAnimation(editingAnimId);
          message.success('Animation deleted');
          handleSelectAnimationToEdit(null);
          await loadData();
      } catch (error) {
          message.error('Failed to delete animation');
          console.error(error);
      }
  };

  return (
    <>
      <Space>
        <Button
          icon={<SettingOutlined />}
          onClick={() => void handleOpenManageModal()}
          style={{
            backgroundColor: UI_COLOR_TRANSPARENT,
            borderColor: UI_BORDER_SOFT,
            color: UI_TEXT_PRIMARY_ON_DARK
          }}
        >
          MANAGE ANIMATIONS
        </Button>
        
        {animations.length > 0 && (
          <Select
            placeholder="Play Animation"
            style={{ width: 180 }}
            onChange={(value) => {
              const anim = animations.find(a => a.id === value);
              if (anim) onPlayAnimation(anim);
            }}
            value={null}
          >
            {animations.map(anim => (
              <Option key={anim.id} value={anim.id}>
                {anim.name}
              </Option>
            ))}
          </Select>
        )}
      </Space>

      {/* Manage Animation Modal */}
      <Modal
        title={
          <Title level={4} style={{ color: UI_ACCENT_GREEN, margin: 0 }}>
            <SettingOutlined /> Manage Animations
          </Title>
        }
        open={manageModalVisible}
        onCancel={() => setManageModalVisible(false)}
        footer={[
           editingAnimId ? (
               <Popconfirm
                    key="delete"
                    title="Delete this animation?"
                    onConfirm={() => void handleDeleteAnimation()}
                    okText="Yes"
                    cancelText="No"
               >
                   <Button danger icon={<DeleteOutlined />}>Delete</Button>
               </Popconfirm>
           ) : null,
           <Button key="cancel" onClick={() => setManageModalVisible(false)}>
               Cancel
           </Button>,
           <Button key="save" type="primary" loading={loading} onClick={() => void handleSaveAnimation()} style={{ backgroundColor: UI_ACCENT_GREEN, borderColor: UI_ACCENT_GREEN }}>
               {editingAnimId ? 'Update Animation' : 'Create Animation'}
           </Button>
        ]}
        style={{ top: 100 }}
        styles={{ mask: { backgroundColor: UI_MODAL_MASK_BG } }}
        className="dark-modal"
      >
        <Space direction="vertical" style={{ width: '100%', marginTop: 16 }} size="large">
          <div>
            <Text style={{ color: UI_TEXT_PRIMARY_ON_DARK, marginBottom: 8, display: 'block' }}>Select Animation to Edit (or Create New)</Text>
            <Select
              style={{ width: '100%' }}
              value={editingAnimId}
              onChange={handleSelectAnimationToEdit}
            >
              <Option value={null}>-- Create New Animation --</Option>
              {animations.map(a => <Option key={a.id} value={a.id}>{a.name}</Option>)}
            </Select>
          </div>

          <div>
            <Text style={{ color: UI_TEXT_PRIMARY_ON_DARK, marginBottom: 8, display: 'block' }}>Animation Name</Text>
            <Input
              placeholder="e.g. Wave, Dance"
              value={animName}
              onChange={(e) => setAnimName(e.target.value)}
              style={{
                backgroundColor: UI_INPUT_SURFACE,
                borderColor: UI_BORDER_SOFT,
                color: UI_TEXT_PRIMARY_ON_DARK
              }}
            />
          </div>

          <div>
            <Text style={{ color: UI_TEXT_PRIMARY_ON_DARK, marginBottom: 8, display: 'block' }}>Keyframes (Select at least 2 poses)</Text>
            <Select
              mode="multiple"
              placeholder="Select poses in order"
              value={selectedPoseIds}
              onChange={setSelectedPoseIds}
              style={{ width: '100%' }}
              options={savedPoses.map(pose => ({ label: pose.name, value: pose.id }))}
            />
          </div>

          <div>
             <Text style={{ color: UI_TEXT_PRIMARY_ON_DARK, marginBottom: 8, display: 'block' }}>Speed Multiplier (1 = normal)</Text>
             <InputNumber
                min={0.1}
                max={10}
                step={0.1}
                value={speed}
                onChange={(v) => setSpeed(v || 1)}
                style={{ width: '100%' }}
             />
          </div>

          <div>
            <Text style={{ color: UI_TEXT_PRIMARY_ON_DARK, marginRight: 16 }}>Loop Animation</Text>
            <Switch checked={loop} onChange={setLoop} />
          </div>
        </Space>
      </Modal>
    </>
  );
};
