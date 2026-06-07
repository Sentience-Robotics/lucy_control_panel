import { useEffect, useState } from 'react';
import ROSLIB from 'roslib';
import { RosBridgeService } from '../Services/ros/ros.service';

export interface UrdfJointLimitRad {
  lowerRad: number;
  upperRad: number;
}

/** Parse URDF XML for revolute/prismatic joint limits (radians). */
export function parseUrdfJointLimits(urdfXml: string): Map<string, UrdfJointLimitRad> {
  const out = new Map<string, UrdfJointLimitRad>();
  if (!urdfXml.trim()) return out;

  const doc = new DOMParser().parseFromString(urdfXml, 'text/xml');
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    console.warn('useUrdfJointLimits: failed to parse robot_description XML');
    return out;
  }

  const joints = doc.querySelectorAll('joint');
  joints.forEach((jointEl) => {
    const name = jointEl.getAttribute('name');
    if (!name) return;
    const type = jointEl.getAttribute('type');
    if (type !== 'revolute' && type !== 'prismatic') return;

    const limitEl = jointEl.querySelector('limit');
    if (!limitEl) return;

    const lower = Number(limitEl.getAttribute('lower'));
    const upper = Number(limitEl.getAttribute('upper'));
    if (!Number.isFinite(lower) || !Number.isFinite(upper) || lower >= upper) return;

    out.set(name, { lowerRad: lower, upperRad: upper });
  });

  return out;
}

/**
 * Subscribe to latched /robot_description and expose URDF joint limits in radians.
 */
export function useUrdfJointLimits(isConnected: boolean): Map<string, UrdfJointLimitRad> {
  const [limits, setLimits] = useState<Map<string, UrdfJointLimitRad>>(() => new Map());

  useEffect(() => {
    if (!isConnected) {
      setLimits(new Map());
      return;
    }

    const ros = RosBridgeService.getInstance().rosConnection;
    if (!ros) return;

    const topic = new ROSLIB.Topic({
      ros,
      name: '/robot_description',
      messageType: 'std_msgs/msg/String',
    });

    const onMessage = (msg: ROSLIB.Message) => {
      const data = (msg as unknown as { data?: string }).data;
      if (typeof data !== 'string' || !data.trim()) return;
      setLimits(parseUrdfJointLimits(data));
    };

    topic.subscribe(onMessage);
    return () => topic.unsubscribe();
  }, [isConnected]);

  return limits;
}
