/**
 * Default field values for hardware-config editor rows.
 *
 * These mirror the expectations of `lucy_config_generator` (servo ranges,
 * enabled flags, sensor shape). Keep them here so the editor never hardcodes
 * defaults inline — `documentHelpers.ts` and any future row builder import them.
 */

/**
 * Servo type used when an actuator row has a missing/blank `servo_type`
 * (display normalization fallback — see `normalizeActuatorType`).
 */
export const DEFAULT_ACTUATOR_TYPE_FALLBACK = '270';

/** Field defaults applied to a freshly-added actuator row in the editor. */
export const DEFAULT_NEW_ACTUATOR_VALUES = {
    servo_type: '180',
    offset_deg: 0,
    direction: 1,
    scale: 1,
    servo_min_deg: 0,
    servo_max_deg: 180,
    servo_default_deg: 90,
    enabled: false,
} as const;

/** Field defaults applied to a freshly-added pressure sensor row in the editor. */
export const DEFAULT_NEW_PRESSURE_SENSOR_VALUES = {
    type: 'pressure',
    min_value: null,
    max_value: null,
    enabled: true,
} as const;

/**
 * Fallback slider bounds (actuator degrees) for a control-panel joint that has
 * no servo limits in the controller config. Mirrors the 0–180° default servo
 * travel used elsewhere in the editor.
 */
export const DEFAULT_JOINT_SLIDER_BOUNDS_DEG = {
    min: 0,
    max: 180,
} as const;

/**
 * Fallback slider position (actuator degrees) when a joint exposes no default
 * (rest) angle — the slider and command both start here.
 */
export const DEFAULT_JOINT_SLIDER_VALUE_DEG = 0;
