import React, { useCallback, useMemo } from 'react';
import { Card, Typography, Space, Button, Badge } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import type { JointControlState } from '../Constants/robotTypes';
import { JointControl } from './JointControl';
import {
    UI_BORDER_MUTED,
    UI_BORDER_SOFT,
    UI_COLOR_TRANSPARENT,
    UI_PANEL_BG,
    UI_TEXT_ON_ACCENT,
    UI_TEXT_PRIMARY_ON_DARK,
} from '../Constants/uiTheme.ts';

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
    const categoryColor = useMemo(() => {
        return '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
    }, []);

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
                backgroundColor: UI_PANEL_BG,
                borderColor: UI_BORDER_MUTED,
                borderLeft: `2px solid ${categoryColor}`,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative'
            }}
            bodyStyle={{
                padding: 16,
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                position: 'relative'
            }}
        >
            {/* ASCII Fill background for all categories - always visible */}
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
                        color: UI_TEXT_ON_ACCENT,
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
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start',
                position: 'relative',
                minHeight: '200px',
                zIndex: 2
            }}>
                <Space direction="vertical" style={{ width: '100%', position: 'relative' }} size="small">
                    {joints.map((joint) => (
                    <JointControl
                        key={joint.name}
                        joint={joint}
                        onValueChange={onJointValueChange}
                        showDegrees={showDegrees}
                    />
                    ))}
                </Space>
            </div>
        </Card>
    );
});
