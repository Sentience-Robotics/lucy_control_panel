import React, { useState, useCallback, useMemo } from 'react';
import { Card, Typography, Space, Button, Badge } from 'antd';
import { DownOutlined, RightOutlined, ReloadOutlined } from '@ant-design/icons';
import type { JointControlState } from '../Constants/robotTypes';
import { JointControl } from './JointControl';

const { Title } = Typography;

interface JointCategoryProps {
    category: string;
    joints: JointControlState[];
    onJointValueChange: (name: string, value: number) => void;
    onResetCategory: (category: string) => void;
    showDegrees: boolean;
}

export const JointCategory: React.FC<JointCategoryProps> = React.memo(({
    category,
    joints,
    onJointValueChange,
    onResetCategory,
    showDegrees
}) => {
    const [isExpanded, setIsExpanded] = useState(true);

    const categoryColor = useMemo(() => {
        switch (category) {
            case 'Head': return '#ff6b6b';
            case 'Left Hand': return '#4ecdc4';
            case 'Right Hand': return '#45b7d1';
            case 'Left Arm': return '#96ceb4';
            case 'Right Arm': return '#feca57';
            case 'Torso': return '#ff9ff3';
            case 'Base': return '#a55eea';
            default: return '#74b9ff';
        }
    }, [category]);

    const handleResetCategory = useCallback(() => {
        onResetCategory(category);
    }, [onResetCategory, category]);

    if (joints.length === 0) {
        return null;
    }

    return (
        <Card
            style={{
                marginBottom: 16,
                backgroundColor: '#0a0a0a',
                borderColor: '#333',
                borderLeft: `2px solid ${categoryColor}`
            }}
            bodyStyle={{ padding: 16 }}
        >
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    marginBottom: isExpanded ? 12 : 0
                }}
                onClick={() => setIsExpanded(!isExpanded)}
            >
            <Space>
                {isExpanded ? <DownOutlined /> : <RightOutlined />}
                <Title
                    level={5}
                    style={{
                        margin: 0,
                        color: categoryColor,
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        fontSize: '14px',
                        fontWeight: 'bold'
                    }}
                >
                    {category}
                </Title>
                <Badge
                    count={joints.length}
                    style={{
                        backgroundColor: categoryColor,
                        color: '#000',
                        fontWeight: 'bold'
                    }}
                />
            </Space>

            <Button
                size="small"
                icon={<ReloadOutlined />}
                onClick={(e) => {
                e.stopPropagation();
                handleResetCategory();
                }}
                style={{
                backgroundColor: 'transparent',
                borderColor: '#444',
                color: '#fff'
                }}
                title={`Reset all ${category} joints to center position`}
            >
                Reset
            </Button>
          </div>

            {isExpanded && (
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                    {joints.map((joint) => (
                    <JointControl
                        key={joint.name}
                        joint={joint}
                        onValueChange={onJointValueChange}
                        showDegrees={showDegrees}
                    />
                    ))}
                </Space>
            )}
        </Card>
    );
});
