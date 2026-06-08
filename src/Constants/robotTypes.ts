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
   Tells JointControl whether the numeric fields are already actuator
   * degrees (show verbatim as °, take input as-is) or URDF radians
   * (convert to ° for display, convert input back)
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
