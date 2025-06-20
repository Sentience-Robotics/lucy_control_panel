import React from 'react';
import { DragOutlined } from '@ant-design/icons';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { JointControlState } from '../Constants/robotTypes';
import { JointCategory } from './JointCategory';

interface DraggableCategoryProps {
  id: string;
  category: string;
  joints: JointControlState[];
  onJointValueChange: (name: string, value: number) => void;
  onResetCategory: (category: string) => void;
  showDegrees: boolean;
}

export const DraggableCategory: React.FC<DraggableCategoryProps> = ({
  id,
  category,
  joints,
  onJointValueChange,
  onResetCategory,
  showDegrees
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging: isBeingDragged
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isBeingDragged ? 0.5 : 1,
        position: 'relative' as const,
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column' as const
    };

    return (
        <div ref={setNodeRef} style={style}>
            <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
                {/* Drag Handle */}
                <div
                    {...attributes}
                    {...listeners}
                    style={{
                        position: 'absolute',
                        top: 15,
                        right: 110,
                        zIndex: 10,
                        cursor: isBeingDragged ? 'grabbing' : 'grab',
                        padding: '6px 8px',
                        backgroundColor: 'rgba(0, 255, 65, 0.1)',
                        border: '1px solid #00ff41',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease',
                        borderRadius: 0
                    }}
                    title="Drag to reorder category"
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(0, 255, 65, 0.2)';
                        e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(0, 255, 65, 0.1)';
                        e.currentTarget.style.transform = 'scale(1)';
                    }}
                >
                    <DragOutlined style={{ color: '#00ff41', fontSize: 14 }} />
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <JointCategory
                        category={category}
                        joints={joints}
                        onJointValueChange={onJointValueChange}
                        onResetCategory={onResetCategory}
                        showDegrees={showDegrees}
                    />
                </div>
            </div>
        </div>
    );
};
