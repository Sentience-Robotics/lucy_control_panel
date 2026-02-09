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
  name: string;
  currentValue: number;
  targetValue: number;
  minValue: number;
  maxValue: number;
  type: Joint['type'];
  category: string | undefined;
  inverted?: boolean;
  restValue?: number;
}

export interface JointConfiguration {
  category?: string;
  minValue?: number;
  maxValue?: number;
  inverted?: boolean;
  restValue?: number;
}
