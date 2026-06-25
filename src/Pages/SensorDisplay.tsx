import React, { useMemo, useState } from 'react';
import { Alert, Col, Row, Select } from 'antd';
import { PressureSensorGraph } from '../Components/Sensors';
import { useActiveHardwareRos } from '../contexts/ActiveHardwareRosContext';
import { useRosConnection } from '../hooks/useRosConnection.hook';
import { useSensorSources } from '../hooks/useSensorSources';

const { Option } = Select;

const SensorDisplay: React.FC = () => {
    const [selectedSensorIds, setSelectedSensorIds] = useState<string[]>([]);
    const sensorSources = useSensorSources();
    const { isConnected } = useRosConnection();
    const { activeHardwareDoc, activeHardwareLoading, activeHardwareError } = useActiveHardwareRos();

    const selectedSources = useMemo(
        () =>
            selectedSensorIds
                .map((id) => sensorSources.find((source) => source.id === id))
                .filter((source): source is NonNullable<typeof source> => Boolean(source)),
        [selectedSensorIds, sensorSources],
    );

    return (
        <>
            {!isConnected ? (
                <Alert
                    type="warning"
                    showIcon
                    message="Connect to the ROS bridge to stream live sensor data."
                    style={{ marginBottom: 16 }}
                />
            ) : null}

            {activeHardwareLoading ? (
                <Alert
                    type="info"
                    showIcon
                    message="Loading active hardware configuration..."
                    style={{ marginBottom: 16 }}
                />
            ) : null}

            {activeHardwareError ? (
                <Alert
                    type="error"
                    showIcon
                    message={activeHardwareError}
                    style={{ marginBottom: 16 }}
                />
            ) : null}

            {!activeHardwareLoading && isConnected && activeHardwareDoc && sensorSources.length === 0 ? (
                <Alert
                    type="info"
                    showIcon
                    message="No pressure sensors are defined in the active hardware configuration."
                    style={{ marginBottom: 16 }}
                />
            ) : null}

            <div
                className="tui-container-dark"
                style={{
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                }}
            >
                <span
                    className="tui-text-muted"
                    style={{ fontSize: '12px', flexShrink: 0, whiteSpace: 'nowrap' }}
                >
                    SELECT PRESSURE SENSORS TO MONITOR:
                </span>
                <Select
                    mode="multiple"
                    style={{ flex: 1, minWidth: 0 }}
                    placeholder="Select pressure sensors..."
                    value={selectedSensorIds}
                    onChange={setSelectedSensorIds}
                    disabled={sensorSources.length === 0}
                    maxTagCount={0}
                    maxTagPlaceholder={(omitted) =>
                        `${omitted.length} sensor${omitted.length === 1 ? '' : 's'} selected`
                    }
                >
                    {sensorSources.map((source) => (
                        <Option key={source.id} value={source.id}>
                            {source.name} ({source.topic})
                        </Option>
                    ))}
                </Select>
            </div>

            <Row gutter={[16, 16]}>
                {selectedSources.map((source) => (
                    <Col key={source.id} xs={24} sm={12} md={8}>
                        <PressureSensorGraph source={source} />
                    </Col>
                ))}
            </Row>
        </>
    );
};

export default SensorDisplay;
