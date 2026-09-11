import { useState, useMemo } from 'react';
import { Pagination } from 'antd';
import { JointCategory } from '../JointCategory';
import type { JointControlState } from '../../Constants/robotTypes';
import { UI_BORDER_MUTED, UI_NAV_BAR_BG } from '../../Constants/uiTheme';

export type CategorizedJoints = Record<string, JointControlState[]>;

export interface PaginatedJointCategoriesProps {
    categoryOrder: string[];
    categorizedJoints: CategorizedJoints;
    onJointValueChange: (name: string, value: number) => void;
    onResetCategory: (category: string) => void;
    onResetJoint?: (name: string) => void;
    showDegrees: boolean;
    disabled: boolean;
    categoriesPerPage?: number;
}

const PaginatedJointCategories = ({
    categoryOrder,
    categorizedJoints,
    onJointValueChange,
    onResetCategory,
    onResetJoint,
    showDegrees,
    disabled,
    categoriesPerPage = 1,
}: PaginatedJointCategoriesProps) => {
    const [categoryPage, setCategoryPage] = useState<number>(1);

    const anchor: React.CSSProperties = {
        position: 'fixed',
        bottom: 16,
        left: 16,
        zIndex: 1000,
        backgroundColor: UI_NAV_BAR_BG,
        padding: '8px',
        border: `1px solid ${UI_BORDER_MUTED}`,
        borderRadius: '0'
    };

    const validCategories = useMemo<string[]>(
        () => categoryOrder.filter(
            category => categorizedJoints[category] && categorizedJoints[category].length > 0
        ),
        [categoryOrder, categorizedJoints]
    );

    const paginatedCategories = useMemo<string[]>(() => {
        const start = (categoryPage - 1) * categoriesPerPage;
        return validCategories.slice(start, start + categoriesPerPage);
    }, [validCategories, categoryPage, categoriesPerPage]);

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div
                style={{
                    flex: 1,
                    minHeight: 0,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                    gridAutoRows: '1fr',
                    gap: '12px',
                    width: '100%',
                    alignItems: 'stretch',
                }}
            >
                {paginatedCategories.map(category => (
                    <div key={category} style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                        <JointCategory
                            category={category}
                            joints={categorizedJoints[category]}
                            onJointValueChange={onJointValueChange}
                            onResetCategory={onResetCategory}
                            onResetJoint={onResetJoint}
                            showDegrees={showDegrees}
                            disabled={disabled}
                        />
                    </div>
                ))}
            </div>

            { validCategories.length > categoriesPerPage && (
                <div style={anchor}>
                    <Pagination
                        current={categoryPage}
                        pageSize={categoriesPerPage}
                        total={validCategories.length}
                        showSizeChanger={false}
                        onChange={setCategoryPage}
                        hideOnSinglePage
                        itemRender={(page, type, originalElement) => {
                            if (type === 'page') {
                                return (
                                    <span
                                        style={{
                                            display: 'inline-block',
                                            padding: '0 12px',
                                        }}
                                    >
                                        {validCategories[page - 1]}
                                    </span>
                                );
                            }

                            return originalElement;
                        }}
                    />
                </div>
            )}
        </div>
    );
}

export default PaginatedJointCategories;
