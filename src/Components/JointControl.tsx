import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { Card, Slider, InputNumber, Typography, Space, Tag } from 'antd';
import type { JointControlState } from '../Constants/robotTypes';
import { UrdfParser } from '../Utils/urdfParser';

const { Text } = Typography;

interface JointControlProps {
  joint: JointControlState;
  onValueChange: (name: string, value: number) => void;
  showDegrees?: boolean;
}

export const JointControl: React.FC<JointControlProps> = React.memo(({
  joint,
  onValueChange,
  showDegrees = true
}) => {
  const [localValue, setLocalValue] = useState(joint.currentValue);

  useEffect(() => {
    setLocalValue(joint.currentValue);
  }, [joint.currentValue]);

  const handleSliderChange = useCallback((value: number | null) => {
    if (value !== null) {
      setLocalValue(value);
    }
  }, []);

  const handleSliderAfterChange = useCallback((value: number) => {
    onValueChange(joint.name, value);
  }, [joint.name, onValueChange]);

  const handleInputChange = useCallback((value: number | null) => {
    if (value !== null) {
      const clampedValue = Math.max(joint.minValue, Math.min(joint.maxValue, value));
      onValueChange(joint.name, clampedValue);
    }
  }, [joint.name, joint.minValue, joint.maxValue, onValueChange]);

  const displayValues = useMemo(() => {
    const getDisplayValue = (radians: number): number => {
      return showDegrees ? Math.round(UrdfParser.radiansToDegrees(radians) * 100) / 100 : Math.round(radians * 1000) / 1000;
    };

    const getDisplayRange = (): [number, number] => {
      if (showDegrees) {
        return [
          Math.round(UrdfParser.radiansToDegrees(joint.minValue) * 100) / 100,
          Math.round(UrdfParser.radiansToDegrees(joint.maxValue) * 100) / 100
        ];
      }
      return [
        Math.round(joint.minValue * 1000) / 1000,
        Math.round(joint.maxValue * 1000) / 1000
      ];
    };

        const [minDisplay, maxDisplay] = getDisplayRange();
    const currentDisplay = getDisplayValue(localValue);

    return { minDisplay, maxDisplay, currentDisplay };
  }, [joint.minValue, joint.maxValue, localValue, showDegrees]);

  const convertInputValue = useCallback((displayValue: number): number => {
    return showDegrees ? UrdfParser.degreesToRadians(displayValue) : displayValue;
  }, [showDegrees]);

  const { minDisplay, maxDisplay, currentDisplay } = displayValues;

  const getJointTypeColor = (type: string): string => {
    switch (type) {
      case 'revolute': return 'blue';
      case 'continuous': return 'green';
      case 'prismatic': return 'orange';
      default: return 'default';
    }
  };

  return (
    <Card
      size="small"
      style={{
        marginBottom: 8,
        backgroundColor: '#0c0c0c',
        borderColor: '#333',
        color: '#fff'
      }}
      bodyStyle={{ padding: 12 }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text strong style={{ color: '#fff', fontSize: '12px' }}>
            {joint.name.replace(/_link_joint$/, '').replace(/i01\./, '')}
          </Text>
          <Tag color={getJointTypeColor(joint.type)}>
            {joint.type}
          </Tag>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Slider
            min={minDisplay}
            max={maxDisplay}
            step={showDegrees ? 0.1 : 0.001}
            value={currentDisplay}
            onChange={(value) => handleSliderChange(convertInputValue(value))}
            onChangeComplete={(value) => handleSliderAfterChange(convertInputValue(value))}
            style={{ flex: 1, margin: 0 }}
            tooltip={{
              formatter: (value) => `${value}${showDegrees ? '°' : 'rad'}`,
              placement: 'top'
            }}
          />

          <InputNumber
            min={minDisplay}
            max={maxDisplay}
            step={showDegrees ? 0.1 : 0.001}
            value={currentDisplay}
            onChange={(value) => handleInputChange(convertInputValue(value || 0))}
            size="small"
            style={{
              width: 80,
              backgroundColor: '#1a1a1a',
              borderColor: '#444'
            }}
            addonAfter={showDegrees ? '°' : 'rad'}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#666' }}>
          <Text type="secondary" style={{ fontSize: '10px' }}>
            Min: {minDisplay}{showDegrees ? '°' : 'rad'}
          </Text>
          <Text type="secondary" style={{ fontSize: '10px' }}>
            Max: {maxDisplay}{showDegrees ? '°' : 'rad'}
          </Text>
        </div>
      </Space>
    </Card>
  );
});
