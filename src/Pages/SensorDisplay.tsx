import React, { useState } from 'react';
import { Select, Row, Col } from 'antd';
import { Page } from '../Components/Page';
import { Terminal, FloatGraph } from '../Components/Sensors';

const { Option } = Select;

const mockDataSources = [
    { id: '1', name: 'Sensor Alpha', type: 'text' },
    { id: '2', name: 'Sensor Beta', type: 'text' },
    { id: '3', name: 'Sensor Gamma', type: 'text' },
    { id: '4', name: 'Sensor Delta', type: 'text' },
    { id: '5', name: 'Sensor Epsilon', type: 'text' },
    { id: '6', name: 'Temperature Sensor', type: 'float' },
];

const SensorDisplay: React.FC = () => {
    const [selectedSources, setSelectedSources] = useState<string[]>([]);

    const handleSelectionChange = (selected: string[]) => {
        setSelectedSources(selected);
    };

    return (
        <Page title showHeader>
            <div style={{ padding: '0 12px' }}>
                <div className="tui-container-dark" style={{ marginBottom: '20px' }}>
                    <div className="tui-text-muted" style={{ marginBottom: '8px', fontSize: '12px' }}>
                        SELECT DATA SOURCES TO MONITOR:
                    </div>
                    <Select
                        mode="multiple"
                        style={{ width: '100%' }}
                        placeholder="Select data sources..."
                        onChange={handleSelectionChange}
                    >
                        {mockDataSources.map(source => (
                            <Option key={source.id} value={source.id}>{source.name}</Option>
                        ))}
                    </Select>
                </div>

                <Row gutter={[16, 16]}>
                    {selectedSources.map(sourceId => {
                        const source = mockDataSources.find(s => s.id === sourceId);
                        return (
                            <Col key={sourceId} xs={24} md={selectedSources.length > 1 ? 12 : 24}>
                            {source?.type === 'float' ? (
                                    <FloatGraph dataSourceId={sourceId} sourceName={source.name} />
                                ) : (
                                    <Terminal dataSourceId={sourceId} sourceName={source?.name || 'Unknown Sensor'} />
                                )}
                            </Col>
                        );
                    })}
                </Row>
            </div>
        </Page>
    );
};

export default SensorDisplay;
