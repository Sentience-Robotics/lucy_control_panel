import { Page } from "../Components/Page.tsx";
import { Space, Typography, Table, Button, message, InputNumber, Switch, Modal, AutoComplete } from "antd";
import { SaveOutlined, ReloadOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useEffect, useState } from "react";

/* Services */
import { JointStateHandler } from "../Services/ros/handlers/JointState.handler";
import { storageService } from "../Services/storage.service";

/* Components */
import { ToggleSwitch } from "../Components/ToggleSwitch";

/* Utils */
import { radianToDegree, degreeToRadian } from "../Utils/math.utils.ts";

/* Types */
import type { JointControlState, JointConfiguration } from "../Constants/robotTypes.ts";

const { Text } = Typography;

interface CategoryCellProps {
    value: string | undefined;
    existingCategories: string[];
    onUpdate: (val: string) => void;
}

const CategoryCell = ({ value, existingCategories, onUpdate }: CategoryCellProps) => {
    const [localValue, setLocalValue] = useState(value || '');

    useEffect(() => {
        setLocalValue(value || '');
    }, [value]);

    const handleBlur = () => {
        if (localValue !== (value || '')) {
            onUpdate(localValue);
        }
    };

    return (
        <AutoComplete
            value={localValue}
            options={existingCategories.map(cat => ({ value: cat }))}
            onChange={setLocalValue}
            onSelect={(val: string) => {
                setLocalValue(val);
                onUpdate(val);
            }}
            onBlur={handleBlur}
            style={{ width: '100%' }}
            placeholder="Select or type category"
            filterOption={(inputValue, option) =>
                option!.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
            }
        />
    );
};

const Configuration = () => {
    const [joints, setJoints] = useState<JointControlState[]>([]);
    const [jointConfigs, setJointConfigs] = useState<Record<string, JointConfiguration>>({});
    const [loading, setLoading] = useState(true);
    const [existingCategories, setExistingCategories] = useState<string[]>([]);
    const [showDegrees, setShowDegrees] = useState(true);
    const [modal, contextHolder] = Modal.useModal();
    const [messageApi, contextHolderMessage] = message.useMessage();

    const loadData = async () => {
        setLoading(true);
        try {
            const initialJoints = JointStateHandler.getInstance().getJoints();

            const savedConfigs = await storageService.loadJointConfigurations();
            setJointConfigs(savedConfigs);

            const categories = new Set<string>();
            Object.values(savedConfigs).forEach(config => {
                if (config.category) {
                    categories.add(config.category);
                }
            });
            setExistingCategories(Array.from(categories));

            const mergedJoints = initialJoints.map(joint => {
                const config = savedConfigs[joint.name];
                return {
                    ...joint,
                    category: config?.category || joint.category,
                    minValue: config?.minValue ?? joint.minValue,
                    maxValue: config?.maxValue ?? joint.maxValue,
                    inverted: config?.inverted ?? joint.inverted,
                    restValue: config?.restValue ?? joint.restValue
                };
            });

            setJoints(mergedJoints);
        } catch (error) {
            console.error("Failed to load configuration:", error);
            messageApi.error("Failed to load configuration");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const updateJointConfig = (jointName: string, updates: Partial<JointConfiguration>) => {
        setJointConfigs(prev => {
            const currentConfig = prev[jointName] || {};
            const newConfig = { ...currentConfig, ...updates };

            if (!newConfig.category && newConfig.minValue === undefined && newConfig.maxValue === undefined && newConfig.inverted === undefined && newConfig.restValue === undefined) {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { [jointName]: _, ...rest } = prev;
                return rest;
            }

            return { ...prev, [jointName]: newConfig };
        });

        setJoints(prev => prev.map(j => {
            if (j.name === jointName) {
                return { ...j, ...updates };
            }
            return j;
        }));

        if (updates.category) {
            setExistingCategories(prev => {
                if (!prev.includes(updates.category!)) {
                    return [...prev, updates.category!];
                }
                return prev;
            });
        }
    };

    const handleSave = () => {
        modal.confirm({
            title: 'Save Configuration?',
            icon: <ExclamationCircleOutlined style={{ color: '#faad14' }} />,
            content: 'This will overwrite the current robot configuration. Incorrect settings may damage the hardware. Are you sure you want to proceed?',
            okText: 'Yes, Save',
            okType: 'danger',
            cancelText: 'Cancel',
            onOk: async () => {
                try {
                    await storageService.saveJointConfigurations(jointConfigs);
                    messageApi.success("Configuration saved successfully");
                } catch (error) {
                    console.error("Failed to save configuration:", error);
                    messageApi.error("Failed to save configuration");
                }
            },
        });
    };

    const handleReset = () => {
        modal.confirm({
            title: 'Reset Configuration?',
            icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
            content: 'This will revert all joint configurations to their default values. This action cannot be undone and may affect robot behavior. Are you sure?',
            okText: 'Yes, Reset',
            okType: 'danger',
            cancelText: 'Cancel',
            onOk: async () => {
                try {
                    await storageService.saveJointConfigurations({});
                    await loadData();
                    messageApi.success("Configuration reset successfully");
                } catch (error) {
                    console.error("Failed to reset configuration:", error);
                    messageApi.error("Failed to reset configuration");
                }
            },
        });
    };

    const formatValue = (value: number | undefined) => {
        if (value === undefined) return undefined;
        return showDegrees ? Number(radianToDegree(value).toFixed(2)) : Number(value.toFixed(3));
    };

    const parseValue = (value: number | null) => {
        if (value === null) return undefined;
        return showDegrees ? degreeToRadian(value) : value;
    };

    const columns = [
        {
            title: 'Joint Name',
            dataIndex: 'name',
            key: 'name',
            render: (text: string) => <Text code>{text}</Text>,
        },
        {
            title: `Min Value (${showDegrees ? 'Deg' : 'Rad'})`,
            key: 'minValue',
            width: 150,
            render: (_: never, record: JointControlState) => (
                <InputNumber
                    value={formatValue(record.minValue)}
                    step={showDegrees ? 1 : 0.1}
                    onChange={(val) => {
                        const newValue = parseValue(val) || 0;
                        if (newValue > record.maxValue) {
                            messageApi.warning("Min value cannot be greater than Max value. Value clamped.");
                            updateJointConfig(record.name, { minValue: record.maxValue });
                            return;
                        }
                        updateJointConfig(record.name, { minValue: newValue });
                    }}
                    style={{ width: '100%' }}
                />
            ),
        },
        {
            title: `Max Value (${showDegrees ? 'Deg' : 'Rad'})`,
            key: 'maxValue',
            width: 150,
            render: (_: never, record: JointControlState) => (
                <InputNumber
                    value={formatValue(record.maxValue)}
                    step={showDegrees ? 1 : 0.1}
                    onChange={(val) => {
                        const newValue = parseValue(val) || 0;
                        if (newValue < record.minValue) {
                            messageApi.warning("Max value cannot be less than Min value. Value clamped.");
                            updateJointConfig(record.name, { maxValue: record.minValue });
                            return;
                        }
                        updateJointConfig(record.name, { maxValue: newValue });
                    }}
                    style={{ width: '100%' }}
                />
            ),
        },
        {
            title: `Rest Value (${showDegrees ? 'Deg' : 'Rad'})`,
            key: 'restValue',
            width: 150,
            render: (_: never, record: JointControlState) => (
                <InputNumber
                    value={formatValue(record.restValue ?? 0)}
                    step={showDegrees ? 1 : 0.1}
                    onChange={(val) => {
                        const newValue = parseValue(val);
                        if (newValue !== undefined) {
                            if (newValue < record.minValue) {
                                messageApi.warning("Rest value must be within Min/Max range. Value clamped to Min.");
                                updateJointConfig(record.name, { restValue: record.minValue });
                                return;
                            }
                            if (newValue > record.maxValue) {
                                messageApi.warning("Rest value must be within Min/Max range. Value clamped to Max.");
                                updateJointConfig(record.name, { restValue: record.maxValue });
                                return;
                            }
                        }
                        updateJointConfig(record.name, { restValue: newValue || 0 });
                    }}
                    style={{ width: '100%' }}
                />
            ),
        },
        {
            title: 'Inverted',
            key: 'inverted',
            width: 100,
            render: (_: never, record: JointControlState) => (
                <Switch
                    checked={record.inverted}
                    onChange={(checked) => updateJointConfig(record.name, { inverted: checked })}
                />
            ),
        },
        {
            title: 'Category',
            key: 'category',
            render: (_: never, record: JointControlState) => (
                <CategoryCell
                    value={record.category}
                    existingCategories={existingCategories}
                    onUpdate={(value) => updateJointConfig(record.name, { category: value })}
                />
            ),
        },
    ];

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
                            fontWeight: 'bold',
                        }}
                    >
                        ▲ LUCY CONTROL PANEL
                    </Text>
                </Space>
            </div>
            <Space align="center" size="middle">
                <ToggleSwitch
                    isOn={showDegrees}
                    onToggle={() => setShowDegrees(v => !v)}
                    title="Angle units"
                    textOn="DEGREES"
                    textOff="RADIANS"
                    width={180}
                    height={32}
                />
                <Button 
                    icon={<ReloadOutlined />} 
                    onClick={handleReset}
                    style={{
                        backgroundColor: 'transparent',
                        borderColor: '#ff4d4f',
                        color: '#ff4d4f',
                        height: 32,
                        display: 'flex',
                        alignItems: 'center',
                        boxShadow: '0 0 8px rgba(255, 77, 79, 0.2)',
                    }}
                >
                    RESET CONFIG
                </Button>
                <Button 
                    icon={<SaveOutlined />} 
                    onClick={handleSave}
                    style={{
                        backgroundColor: '#00ff41',
                        borderColor: '#00ff41',
                        color: '#000',
                        height: 32,
                        display: 'flex',
                        alignItems: 'center',
                        boxShadow: '0 0 8px #00ff41',
                    }}
                >
                    SAVE CONFIG
                </Button>
            </Space>
        </div>
    );

    return (
        <Page
            showHeader
            headerContent={headerContent}
            contentStyle={{ padding: 12, position: 'relative' }}
            removeScrollbars={false}
        >
            {contextHolder}
            {contextHolderMessage}
            <Table
                dataSource={joints}
                // @ts-expect-error use of never instead of any
                columns={columns}
                rowKey="name"
                loading={loading}
                pagination={false}
                style={{ marginTop: 16 }}
            />
        </Page>
    );
}

export default Configuration;