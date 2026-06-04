import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { Card, Slider, InputNumber, Typography, Space, Tag } from 'antd';
import type { JointControlState } from '../Constants/robotTypes';

import { radianToDegree, degreeToRadian } from "../Utils/math.utils.ts";
import {
    UI_ACCENT_BLUE,
    UI_ACCENT_GREEN,
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
  disabled?: boolean;
}

export const JointControl: React.FC<JointControlProps> = React.memo(({
  joint,
  onValueChange,
  showDegrees = true,
  disabled = false,
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

  const actuatorNative = Boolean(joint.valueInActuatorDegrees && showDegrees);

  const displayValues = useMemo(() => {
    const getDisplayValue = (value: number): number => {
      if (actuatorNative) {
        return Math.round(value * 100) / 100;
      }
      return showDegrees
        ? Math.round(radianToDegree(value) * 100) / 100
        : Math.round(value * 1000) / 1000;
    };

    const getDisplayRange = (): [number, number] => {
      if (actuatorNative) {
        return [
          Math.round(joint.minValue * 100) / 100,
          Math.round(joint.maxValue * 100) / 100,
        ];
      }
      if (showDegrees) {
        return [
          Math.round(radianToDegree(joint.minValue) * 100) / 100,
          Math.round(radianToDegree(joint.maxValue) * 100) / 100,
        ];
      }
      return [
        Math.round(joint.minValue * 1000) / 1000,
        Math.round(joint.maxValue * 1000) / 1000,
      ];
    };

    const [minDisplay, maxDisplay] = getDisplayRange();
    const currentDisplay = getDisplayValue(localValue);

    return { minDisplay, maxDisplay, currentDisplay };
  }, [joint.minValue, joint.maxValue, localValue, showDegrees, actuatorNative]);

  const convertInputValue = useCallback((displayValue: number): number => {
    if (actuatorNative) {
      return displayValue;
    }
    return showDegrees ? degreeToRadian(displayValue) : displayValue;
  }, [showDegrees, actuatorNative]);

  const { minDisplay, maxDisplay, currentDisplay } = displayValues;

  const actualBarPercent = useMemo(() => {
    if (joint.actualValue === undefined) return undefined;
    const actualDisplay = actuatorNative
      ? Math.round(joint.actualValue * 100) / 100
      : showDegrees
        ? Math.round(radianToDegree(joint.actualValue) * 100) / 100
        : Math.round(joint.actualValue * 1000) / 1000;
    const pct = ((actualDisplay - minDisplay) / (maxDisplay - minDisplay)) * 100;
    return Math.max(0, Math.min(100, pct));
  }, [joint.actualValue, minDisplay, maxDisplay, showDegrees, actuatorNative]);

  const restBarPercent = useMemo(() => {
    if (joint.restValue === undefined) return undefined;
    const restDisplay = actuatorNative
      ? Math.round(joint.restValue * 100) / 100
      : showDegrees
        ? Math.round(radianToDegree(joint.restValue) * 100) / 100
        : Math.round(joint.restValue * 1000) / 1000;
    const pct = ((restDisplay - minDisplay) / (maxDisplay - minDisplay)) * 100;
    return Math.max(0, Math.min(100, pct));
  }, [joint.restValue, minDisplay, maxDisplay, showDegrees, actuatorNative]);

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
          <div style={{ flex: 1, position: 'relative' }}>
            <Slider
              min={minDisplay}
              max={maxDisplay}
              step={showDegrees ? 0.1 : 0.001}
              value={currentDisplay}
              onChange={(value) => handleSliderChange(convertInputValue(value))}
              onChangeComplete={(value) => handleSliderAfterChange(convertInputValue(value))}
              disabled={disabled}
              style={{ margin: 0 }}
              tooltip={{
                formatter: (value) => `${value}${showDegrees ? '°' : 'rad'}`,
                placement: 'top'
              }}
            />
            {restBarPercent !== undefined && (
              <div
                title={`Default: ${actuatorNative || showDegrees
                  ? `${Math.round((actuatorNative ? joint.restValue! : radianToDegree(joint.restValue!)) * 10) / 10}°`
                  : `${Math.round(joint.restValue! * 1000) / 1000}rad`}`}
                style={{
                  position: 'absolute',
                  left: `${restBarPercent}%`,
                  top: -6,
                  transform: 'translate(-50%, -50%)',
                  width: 4,
                  height: 4,
                  backgroundColor: UI_ACCENT_GREEN,
                  borderRadius: 2,
                  pointerEvents: 'none',
                  boxShadow: `0 0 4px ${UI_ACCENT_GREEN}`,
                }}
              />
            )}
            {actualBarPercent !== undefined && (
              <div
                title={`Actual: ${actuatorNative || showDegrees
                  ? `${Math.round((actuatorNative ? joint.actualValue! : radianToDegree(joint.actualValue!)) * 10) / 10}°`
                  : `${Math.round(joint.actualValue! * 1000) / 1000}rad`}`}
                style={{
                  position: 'absolute',
                  left: `${actualBarPercent}%`,
                  top: 19,
                  transform: 'translate(-50%, -50%)',
                  width: 4,
                  height: 4,
                  backgroundColor: UI_ACCENT_BLUE,
                  borderRadius: 2,
                  pointerEvents: 'none',
                  boxShadow: `0 0 4px ${UI_ACCENT_BLUE}`,
                }}
              />
            )}
          </div>

          <InputNumber
            min={minDisplay}
            max={maxDisplay}
            step={showDegrees ? 0.1 : 0.001}
            value={currentDisplay}
            onChange={(value) => handleInputChange(convertInputValue(value || 0))}
            disabled={disabled}
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
