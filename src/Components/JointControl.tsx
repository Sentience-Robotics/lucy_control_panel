import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { Card, Slider, InputNumber, Typography, Space, Tag, Button, Tooltip } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import type { JointControlState } from '../Constants/robotTypes';

import { radianToDegree, degreeToRadian } from "../Utils/math.utils.ts";
import {
    UI_ACCENT_BLUE,
    UI_ACCENT_GREEN,
    UI_BORDER_MUTED,
    UI_BORDER_SOFT,
    UI_COLOR_TRANSPARENT,
    UI_INPUT_SURFACE,
    UI_LIST_ROW_BG,
    UI_TEXT_PRIMARY_ON_DARK,
    UI_TEXT_SECONDARY_MUTED,
} from '../Constants/uiTheme.ts';

const { Text } = Typography;

interface JointControlProps {
  joint: JointControlState;
  onValueChange: (name: string, value: number) => void;
  onReset?: (name: string) => void;
  showDegrees?: boolean;
  disabled?: boolean;
}

interface TrackMarkerProps {
  percent: number;
  top: number;
  color: string;
  label: string;
  valueText: string;
  description: string;
  /** Side the tooltip opens on, so it never covers the slider it sits next to. */
  placement: 'top' | 'bottom';
}

const MARKER_HIT_SIZE = 12;

// Track marker (actual feedback / rest). Uses transform, not `left: %`, so updates skip layout.
// Memoized to avoid re-rendering on every slider drag.
const TrackMarker = React.memo(({ percent, top, color, label, valueText, description, placement }: TrackMarkerProps) => (
  <Tooltip
    placement={placement}
    title={
      <span style={{ fontSize: '11px' }}>
        <strong style={{ color }}>{label}: {valueText}</strong>
        <br />
        {description}
      </span>
    }
  >
    <div
      role="img"
      aria-label={`${label}: ${valueText}. ${description}`}
      style={{
        position: 'absolute',
        left: 0,
        top,
        width: MARKER_HIT_SIZE,
        height: MARKER_HIT_SIZE,
        marginLeft: -MARKER_HIT_SIZE / 2,
        marginTop: -MARKER_HIT_SIZE / 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'help',
        transform: `translateX(${percent}cqw)`,
        willChange: 'transform',
      }}
    >
      <div
        style={{
          width: 4,
          height: 4,
          backgroundColor: color,
          borderRadius: 2,
          boxShadow: `0 0 4px ${color}`,
          pointerEvents: 'none',
        }}
      />
    </div>
  </Tooltip>
));
TrackMarker.displayName = 'TrackMarker';

export const JointControl: React.FC<JointControlProps> = React.memo(({
  joint,
  onValueChange,
  onReset,
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

  const handleReset = useCallback(() => {
    onReset?.(joint.name);
  }, [onReset, joint.name]);

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

  const formatMarkerValue = useCallback((value: number): string => {
    if (actuatorNative || showDegrees) {
      const degrees = actuatorNative ? value : radianToDegree(value);
      return `${Math.round(degrees * 10) / 10}°`;
    }
    return `${Math.round(value * 1000) / 1000}rad`;
  }, [actuatorNative, showDegrees]);

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
            {joint.displayName ?? joint.name}
          </Text>
          <Tag color={getJointTypeColor(joint.type)}>
            {joint.type}
          </Tag>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, position: 'relative', containerType: 'inline-size' }}>
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
              <TrackMarker
                percent={restBarPercent}
                top={-6}
                color={UI_ACCENT_GREEN}
                label="Default"
                valueText={formatMarkerValue(joint.restValue!)}
                description="Rest position of this joint: where the reset button sends it back to."
                placement="top"
              />
            )}
            {actualBarPercent !== undefined && (
              <TrackMarker
                percent={actualBarPercent}
                top={19}
                color={UI_ACCENT_BLUE}
                label="Actual"
                valueText={formatMarkerValue(joint.actualValue!)}
                description="Real position reported by the simulator: it may lag behind the value you command."
                placement="bottom"
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

          {onReset && (
            <Button
              size="small"
              icon={<ReloadOutlined />}
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                handleReset();
              }}
              style={{
                backgroundColor: UI_COLOR_TRANSPARENT,
                borderColor: UI_BORDER_SOFT,
                color: UI_TEXT_PRIMARY_ON_DARK
              }}
              title={`Reset ${joint.displayName ?? joint.name} to its rest value`}
            />
          )}
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
