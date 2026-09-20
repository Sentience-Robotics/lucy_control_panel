/*
 * Copyright 2025-2026 Sentience Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface JointLimit {
  lower: number;
  upper: number;
  effort: number;
  velocity: number;
}

export interface JointAxis {
  x: number;
  y: number;
  z: number;
}

export interface JointOrigin {
  rpy: [number, number, number]; // roll, pitch, yaw
  xyz: [number, number, number]; // x, y, z position
}

export interface Joint {
  name: string;
  type: 'fixed' | 'revolute' | 'continuous' | 'prismatic' | 'floating' | 'planar';
  limit?: JointLimit;
  origin: JointOrigin;
  parentLink: string;
  childLink: string;
  axis?: JointAxis;
}

export interface JointControlState {
  /** URDF joint name — the key used for ROS publish/subscribe and state lookup. */
  name: string;
  /** Label shown on the slider (actuator id; falls back to the joint name). */
  displayName?: string;
  currentValue: number;
  targetValue: number;
  /** Actual position reported by /joint_states — undefined until first feedback arrives. */
  actualValue?: number;
  minValue: number;
  maxValue: number;
  type: Joint['type'];
  category: string | undefined;
  inverted?: boolean;
  restValue?: number;
  /**
   * Legacy: when true, JointControl treats numeric fields as actuator degrees.
   * Current pipeline stores servo radians end-to-end; leave unset/false so
   * deg↔rad conversion happens only at the display boundary.
   */
  valueInActuatorDegrees?: boolean;
}

export interface JointConfiguration {
  category?: string;
  minValue?: number;
  maxValue?: number;
  inverted?: boolean;
  restValue?: number;
}
