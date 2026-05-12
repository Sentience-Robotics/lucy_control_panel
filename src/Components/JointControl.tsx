import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { Card, Slider, InputNumber, Typography, Space, Tag } from 'antd';
import type { JointControlState } from '../Constants/robotTypes';

import { radianToDegree, degreeToRadian } from "../Utils/math.utils.ts";
import {
    UI_BORDER_MUTED,
    UI_BORDER_SOFT,
    UI_INPUT_SURFACE,
    UI_LIST_ROW_BG,
    UI_TEXT_PRIMARY_ON_DARK,
    UI_TEXT_SECONDARY_MUTED,
} from '../Constants/uiTheme.ts';

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
      return showDegrees ? Math.round(radianToDegree(radians) * 100) / 100 : Math.round(radians * 1000) / 1000;
    };

    const getDisplayRange = (): [number, number] => {
      if (showDegrees) {
        return [
          Math.round(radianToDegree(joint.minValue) * 100) / 100,
          Math.round(radianToDegree(joint.maxValue) * 100) / 100
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
    return showDegrees ? degreeToRadian(displayValue) : displayValue;
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
        backgroundColor: UI_LIST_ROW_BG,
        borderColor: UI_BORDER_MUTED,
        color: UI_TEXT_PRIMARY_ON_DARK
      }}
      bodyStyle={{ padding: 12 }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text strong style={{ color: UI_TEXT_PRIMARY_ON_DARK, fontSize: '12px' }}>
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
              backgroundColor: UI_INPUT_SURFACE,
              borderColor: UI_BORDER_SOFT
            }}
            addonAfter={showDegrees ? '°' : 'rad'}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: UI_TEXT_SECONDARY_MUTED }}>
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
