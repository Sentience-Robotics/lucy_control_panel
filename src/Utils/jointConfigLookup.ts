import type { ControllerJointConfig, JointLimitDeg } from '../Constants/rosConfig';
import type { ActuatorMapping } from './actuatorJointMapping';
import { DEFAULT_ACTUATOR_MAPPING } from './actuatorJointMapping';

export interface JointConfigMeta {
  limit?: JointLimitDeg;
  mapping: ActuatorMapping;
}

export function jointConfigMetaFromControllers(
  configs: ControllerJointConfig[],
): Map<string, JointConfigMeta> {
  const out = new Map<string, JointConfigMeta>();
  for (const cfg of configs) {
    for (const name of cfg.joints) {
      const limit = cfg.jointLimits?.[name];
      out.set(name, {
        limit,
        mapping: limit?.mapping ?? DEFAULT_ACTUATOR_MAPPING,
      });
    }
  }
  return out;
}
