import React, { useCallback } from 'react';
import { Card, Typography, Space, Button, Badge } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import type { JointControlState } from '../../Constants/robotTypes.ts';
import { JointControl } from './JointControl.tsx';
import {
    UI_ACCENT_GREEN,
    UI_BORDER_MUTED,
    UI_BORDER_SOFT,
    UI_COLOR_TRANSPARENT,
    UI_PANEL_BG,
    UI_TEXT_ON_ACCENT,
    UI_TEXT_PRIMARY_ON_DARK,
} from '../../Constants/uiTheme.ts';

const { Title } = Typography;

interface JointCategoryProps {
    category: string;
    joints: JointControlState[];
    onJointValueChange: (name: string, value: number) => void;
    onResetCategory: (category: string) => void;
    onResetJoint?: (name: string) => void;
    showDegrees: boolean;
    disabled?: boolean;
}

export const JointCategory: React.FC<JointCategoryProps> = React.memo(({
    category,
    joints,
    onJointValueChange,
    onResetCategory,
    onResetJoint,
    showDegrees,
    disabled = false,
}) => {
    const handleResetCategory = useCallback(() => {
        onResetCategory(category);
    }, [onResetCategory, category]);

    if (joints.length === 0) {
        return null;
    }

    return (
        <Card
            style={{
                backgroundColor: UI_PANEL_BG,
                borderColor: UI_BORDER_MUTED,
                borderLeft: `2px solid ${UI_ACCENT_GREEN}`,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative'
            }}
            bodyStyle={{
                padding: 16,
                flex: 1,
                minHeight: 0,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative'
            }}
        >
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 12,
                    position: 'relative',
                    zIndex: 2
                }}
            >
            <Space>
                <Title
                    level={5}
                    style={{
                        margin: 0,
                        color: UI_ACCENT_GREEN,
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
                        backgroundColor: UI_ACCENT_GREEN,
                        color: UI_TEXT_ON_ACCENT,
                        fontWeight: 'bold'
                    }}
                />
            </Space>

            <Button
                size="small"
                icon={<ReloadOutlined />}
                disabled={disabled}
                onClick={(e) => {
                e.stopPropagation();
                handleResetCategory();
                }}
                style={{
                backgroundColor: UI_COLOR_TRANSPARENT,
                borderColor: UI_BORDER_SOFT,
                color: UI_TEXT_PRIMARY_ON_DARK
                }}
                title={`Reset all ${category} joints to their rest value`}
            >
                Reset
            </Button>
          </div>

            <div style={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                overflowX: 'hidden',
                position: 'relative',
                zIndex: 2
            }}>
                <Space direction="vertical" style={{ width: '100%', position: 'relative' }} size="small">
                    {joints.map((joint) => (
                    <JointControl
                        key={joint.name}
                        joint={joint}
                        onValueChange={onJointValueChange}
                        onReset={onResetJoint}
                        showDegrees={showDegrees}
                        disabled={disabled}
                    />
                    ))}
                </Space>
            </div>
        </Card>
    );
});
