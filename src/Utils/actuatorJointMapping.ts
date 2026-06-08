import { degreeToRadian, radianToDegree } from './math.utils.ts';

/** Per-actuator calibration between actuator degrees and URDF joint commands. */
export interface ActuatorMapping {
  offsetDeg: number;
  direction: number;
  scale: number;
}

export const DEFAULT_ACTUATOR_MAPPING: ActuatorMapping = {
  offsetDeg: 0,
  direction: 1,
  scale: 1,
};

/** joint_rad = deg_to_rad((actuator_deg - offset_deg) * direction * scale) */
export function actuatorDegToJointRad(actuatorDeg: number, mapping: ActuatorMapping): number {
  const jointDeg = (actuatorDeg - mapping.offsetDeg) * mapping.direction * mapping.scale;
  return degreeToRadian(jointDeg);
}

/** actuator_deg = (rad_to_deg(joint_rad) / (direction * scale)) + offset_deg */
export function jointRadToActuatorDeg(jointRad: number, mapping: ActuatorMapping): number {
  const jointDeg = radianToDegree(jointRad);
  const denom = mapping.direction * mapping.scale;
  if (denom === 0) {
    return mapping.offsetDeg;
  }
  return jointDeg / denom + mapping.offsetDeg;
}

export function clampActuatorDeg(value: number, minDeg: number, maxDeg: number): number {
  return Math.min(Math.max(value, minDeg), maxDeg);
}

/** Intersect electrical and URDF-mapped actuator envelopes for LCP slider bounds. */
export function intersectActuatorSliderBounds(
  actuatorMinDeg: number,
  actuatorMaxDeg: number,
  actuatorDefaultDeg: number,
  urdfLowerRad: number,
  urdfUpperRad: number,
  mapping: ActuatorMapping,
): { minDeg: number; maxDeg: number; defaultDeg: number } {
  const lo = jointRadToActuatorDeg(urdfLowerRad, mapping);
  const hi = jointRadToActuatorDeg(urdfUpperRad, mapping);
  const [mappedLo, mappedHi] = lo <= hi ? [lo, hi] : [hi, lo];
  const minDeg = Math.max(actuatorMinDeg, mappedLo);
  const maxDeg = Math.min(actuatorMaxDeg, mappedHi);
  const defaultDeg = clampActuatorDeg(actuatorDefaultDeg, minDeg, maxDeg);
  return { minDeg, maxDeg, defaultDeg };
}
