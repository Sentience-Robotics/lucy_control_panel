import type { Joint, JointControlState } from '../Constants/robotTypes';

export class UrdfParser {
  private xmlDoc: Document;

  constructor(urdfContent: string) {
    const parser = new DOMParser();
    this.xmlDoc = parser.parseFromString(urdfContent, 'text/xml');
  }

  public parseJoints(): Joint[] {
    const joints: Joint[] = [];
    const jointElements = this.xmlDoc.querySelectorAll('joint');

    jointElements.forEach((jointElement) => {
      const name = jointElement.getAttribute('name') || '';
      const type = jointElement.getAttribute('type') as Joint['type'] || 'fixed';

      // Parse limit
      const limitElement = jointElement.querySelector('limit');
      const limit = limitElement ? {
        lower: parseFloat(limitElement.getAttribute('lower') || '0'),
        upper: parseFloat(limitElement.getAttribute('upper') || '0'),
        effort: parseFloat(limitElement.getAttribute('effort') || '0'),
        velocity: parseFloat(limitElement.getAttribute('velocity') || '0')
      } : undefined;

      // Parse origin
      const originElement = jointElement.querySelector('origin');
      const rpy = originElement?.getAttribute('rpy')?.split(' ').map(Number) || [0, 0, 0];
      const xyz = originElement?.getAttribute('xyz')?.split(' ').map(Number) || [0, 0, 0];

      // Parse axis
      const axisElement = jointElement.querySelector('axis');
      const axis = axisElement ? {
        x: parseFloat(axisElement.getAttribute('xyz')?.split(' ')[0] || '0'),
        y: parseFloat(axisElement.getAttribute('xyz')?.split(' ')[1] || '0'),
        z: parseFloat(axisElement.getAttribute('xyz')?.split(' ')[2] || '0')
      } : undefined;

      // Parse parent and child links
      const parentElement = jointElement.querySelector('parent');
      const childElement = jointElement.querySelector('child');
      const parentLink = parentElement?.getAttribute('link') || '';
      const childLink = childElement?.getAttribute('link') || '';

      joints.push({
        name,
        type,
        limit,
        origin: {
          rpy: rpy as [number, number, number],
          xyz: xyz as [number, number, number]
        },
        parentLink,
        childLink,
        axis
      });
    });

    return joints;
  }

  public static createJointControlStates(joints: Joint[]): JointControlState[] {
    return joints
      .filter(joint => joint.type === 'revolute' || joint.type === 'continuous')
      .map(joint => {
        const category = this.categorizeJoint(joint.name);
        const minValue = joint.limit?.lower || -3.14159;
        const maxValue = joint.limit?.upper || 3.14159;
        const midValue = (minValue + maxValue) / 2;

        return {
          name: joint.name,
          currentValue: midValue,
          targetValue: midValue,
          minValue,
          maxValue,
          type: joint.type,
          category
        };
      });
  }

  private static categorizeJoint(jointName: string): string {
    const name = jointName.toLowerCase();

    if (name.includes('head') || name.includes('eye') || name.includes('jaw') || name.includes('neck')) {
      return 'Head';
    } else if (name.includes('lefthand') || name.includes('left') && (name.includes('thumb') || name.includes('index') || name.includes('majeure') || name.includes('ring') || name.includes('pinky'))) {
      return 'Left Hand';
    } else if (name.includes('righthand') || name.includes('right') && (name.includes('thumb') || name.includes('index') || name.includes('majeure') || name.includes('ring') || name.includes('pinky'))) {
      return 'Right Hand';
    } else if (name.includes('left') && (name.includes('shoulder') || name.includes('elbow') || name.includes('wrist'))) {
      return 'Left Arm';
    } else if (name.includes('right') && (name.includes('shoulder') || name.includes('elbow') || name.includes('wrist'))) {
      return 'Right Arm';
    } else if (name.includes('torso') || name.includes('stom')) {
      return 'Torso';
    } else {
      return 'Base';
    }
  }

  public static radiansToDegrees(radians: number): number {
    return radians * (180 / Math.PI);
  }

  public static degreesToRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
