/** Per-actuator calibration between servo radians and URDF joint commands. */
export interface ActuatorMapping {
  offsetRad: number;
  direction: number;
  scale: number;
}

export const DEFAULT_ACTUATOR_MAPPING: ActuatorMapping = {
  offsetRad: 0,
  direction: 1,
  scale: 1,
};

/** joint_rad = (servo_rad - offset_rad) * direction * scale */
export function servoRadToJointRad(servoRad: number, mapping: ActuatorMapping): number {
  return (servoRad - mapping.offsetRad) * mapping.direction * mapping.scale;
}

/** servo_rad = joint_rad / (direction * scale) + offset_rad */
export function jointRadToServoRad(jointRad: number, mapping: ActuatorMapping): number {
  const denom = mapping.direction * mapping.scale;
  if (denom === 0) {
    return mapping.offsetRad;
  }
  return jointRad / denom + mapping.offsetRad;
}

export function clampServoRad(value: number, minRad: number, maxRad: number): number {
  return Math.min(Math.max(value, minRad), maxRad);
}

/** Intersect electrical and URDF-mapped servo envelopes for LCP slider bounds. */
export function intersectActuatorSliderBounds(
  servoMinRad: number,
  servoMaxRad: number,
  servoDefaultRad: number,
  urdfLowerRad: number,
  urdfUpperRad: number,
  mapping: ActuatorMapping,
): { minRad: number; maxRad: number; defaultRad: number } {
  const lo = jointRadToServoRad(urdfLowerRad, mapping);
  const hi = jointRadToServoRad(urdfUpperRad, mapping);
  const [mappedLo, mappedHi] = lo <= hi ? [lo, hi] : [hi, lo];
  const minRad = Math.max(servoMinRad, mappedLo);
  const maxRad = Math.min(servoMaxRad, mappedHi);
  const defaultRad = clampServoRad(servoDefaultRad, minRad, maxRad);
  return { minRad, maxRad, defaultRad };
}
