import type { JointControlState, JointConfiguration } from '../Constants/robotTypes';

export class PoseInUseError extends Error {
    constructor(public animationNames: string[]) {
        super(`Pose is in use by the following animations: ${animationNames.join(', ')}`);
        this.name = 'PoseInUseError';
    }
}

export interface SavedPose {
  id: string;
  name: string;
  timestamp: number;
  joints: Record<string, number>; // joint name -> value mapping
}

export interface SavedAnimation {
    id: string;
    name: string;
    timestamp: number;
    poseIds: string[];
    speed: number; // 1 = normal
    loop: boolean;
}

export interface StorageService {
  savePose(name: string, joints: JointControlState[]): Promise<SavedPose>;
  loadPoses(): Promise<SavedPose[]>;
  deletePose(id: string, force?: boolean): Promise<void>;
  loadPose(id: string): Promise<SavedPose | null>;
  saveJointConfigurations(configs: Record<string, JointConfiguration>): Promise<void>;
  loadJointConfigurations(): Promise<Record<string, JointConfiguration>>;
  saveAnimation(animation: Partial<SavedAnimation>): Promise<SavedAnimation>;
  loadAnimations(): Promise<SavedAnimation[]>;
  deleteAnimation(id: string): Promise<void>;
  loadAnimation(id: string): Promise<SavedAnimation | null>;
}

// localStorage-based implementation
class LocalStorageService implements StorageService {
  private readonly POSES_KEY = 'lucy_poses';
  private readonly ANIMATIONS_KEY = 'lucy_animations';
  private readonly CONFIGS_KEY = 'lucy_joint_configs';

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  private loadPosesFromStorage(): SavedPose[] {
    try {
      const data = localStorage.getItem(this.POSES_KEY);
      if (!data) return [];

      const poses = JSON.parse(data);
      return Array.isArray(poses) ? poses : [];
    } catch (error) {
      console.warn('Failed to load poses from localStorage:', error);
      return [];
    }
  }

  private savePosesToStorage(poses: SavedPose[]): void {
    try {
      localStorage.setItem(this.POSES_KEY, JSON.stringify(poses));
    } catch (error) {
      console.error('Failed to save poses to localStorage:', error);
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        throw new Error('Storage quota exceeded. Please delete some poses to free up space.');
      }
      throw error;
    }
  }

  async savePose(name: string, joints: JointControlState[]): Promise<SavedPose> {
    const existingPoses = this.loadPosesFromStorage();

    // Convert joints array to object for more efficient storage
    const jointValues: Record<string, number> = {};
    joints.forEach(joint => {
      jointValues[joint.name] = joint.currentValue;
    });

    const newPose: SavedPose = {
      id: this.generateId(),
      name: name.trim(),
      timestamp: Date.now(),
      joints: jointValues
    };

    // Check for duplicate names and add counter if needed
    const existingNames = existingPoses.map(p => p.name);
    let finalName = newPose.name;
    let counter = 1;
    while (existingNames.includes(finalName)) {
      finalName = `${newPose.name} (${counter})`;
      counter++;
    }
    newPose.name = finalName;

    // Add the new pose and save all poses
    const updatedPoses = [...existingPoses, newPose];
    this.savePosesToStorage(updatedPoses);

    return newPose;
  }

  async loadPoses(): Promise<SavedPose[]> {
    const poses = this.loadPosesFromStorage();
    return poses.sort((a, b) => b.timestamp - a.timestamp);
  }

  async deletePose(id: string, force = false): Promise<void> {
    const poses = this.loadPosesFromStorage();
    const animations = this.loadAnimationsFromStorage();

    const linkedAnimations = animations.filter(anim => anim.poseIds.includes(id));

    if (linkedAnimations.length > 0 && !force) {
        throw new PoseInUseError(linkedAnimations.map(a => a.name));
    }

    if (linkedAnimations.length > 0 && force) {
        const linkedAnimationIds = linkedAnimations.map(a => a.id);
        const updatedAnimations = animations.filter(a => !linkedAnimationIds.includes(a.id));
        this.saveAnimationsToStorage(updatedAnimations);
    }
    
    const filteredPoses = poses.filter(pose => pose.id !== id);
    this.savePosesToStorage(filteredPoses);
  }

  async loadPose(id: string): Promise<SavedPose | null> {
    const poses = this.loadPosesFromStorage();
    return poses.find(pose => pose.id === id) || null;
  }

  async saveJointConfigurations(configs: Record<string, JointConfiguration>): Promise<void> {
    try {
      localStorage.setItem(this.CONFIGS_KEY, JSON.stringify(configs));
    } catch (error) {
      console.error('Failed to save joint configurations to localStorage:', error);
      throw error;
    }
  }

  async loadJointConfigurations(): Promise<Record<string, JointConfiguration>> {
    try {
      const data = localStorage.getItem(this.CONFIGS_KEY);
      if (!data) return {};
      return JSON.parse(data);
    } catch (error) {
      console.warn('Failed to load joint configurations from localStorage:', error);
      return {};
    }
  }

  private loadAnimationsFromStorage(): SavedAnimation[] {
    try {
      const data = localStorage.getItem(this.ANIMATIONS_KEY);
      if (!data) return [];

      const animations = JSON.parse(data);
      return Array.isArray(animations) ? animations : [];
    } catch (error) {
      console.warn('Failed to load animations from localStorage:', error);
      return [];
    }
  }

    private saveAnimationsToStorage(animations: SavedAnimation[]): void {
        try {
            localStorage.setItem(this.ANIMATIONS_KEY, JSON.stringify(animations));
        } catch (error) {
            console.error('Failed to save animations to localStorage:', error);
            if (error instanceof Error && error.name === 'QuotaExceededError') {
                throw new Error('Storage quota exceeded. Please delete some items to free up space.');
            }
            throw error;
        }
    }

    async saveAnimation(animationData: Partial<SavedAnimation>): Promise<SavedAnimation> {
        const animations = this.loadAnimationsFromStorage();
        
        if (animationData.id) {
            // Update existing animation
            const index = animations.findIndex(a => a.id === animationData.id);
            if (index > -1) {
                const updatedAnimation = { ...animations[index], ...animationData, timestamp: Date.now() };
                animations[index] = updatedAnimation;
                this.saveAnimationsToStorage(animations);
                return updatedAnimation;
            }
        }

        // Create new animation
        if (!animationData.name || !animationData.poseIds) {
            throw new Error('Animation name and poseIds are required for new animations.');
        }

        const newAnimation: SavedAnimation = {
            id: this.generateId(),
            name: animationData.name.trim(),
            timestamp: Date.now(),
            poseIds: animationData.poseIds,
            speed: animationData.speed ?? 1,
            loop: animationData.loop ?? false,
        };

        const existingNames = animations.map(a => a.name);
        let finalName = newAnimation.name;
        let counter = 1;
        while (existingNames.includes(finalName)) {
            finalName = `${newAnimation.name} (${counter})`;
            counter++;
        }
        newAnimation.name = finalName;

        const updatedAnimations = [...animations, newAnimation];
        this.saveAnimationsToStorage(updatedAnimations);

        return newAnimation;
    }

    async loadAnimations(): Promise<SavedAnimation[]> {
        const animations = this.loadAnimationsFromStorage();
        return animations.sort((a, b) => b.timestamp - a.timestamp);
    }

    async deleteAnimation(id: string): Promise<void> {
        const animations = this.loadAnimationsFromStorage();
        const filteredAnimations = animations.filter(animation => animation.id !== id);
        this.saveAnimationsToStorage(filteredAnimations);
    }

    async loadAnimation(id: string): Promise<SavedAnimation | null> {
        const animations = this.loadAnimationsFromStorage();
        return animations.find(animation => animation.id === id) || null;
    }
}

// Factory function to create storage service
// This makes it easy to swap implementations later
export function createStorageService(): StorageService {
  // Using localStorage for better performance and larger capacity
  // Later, this can be changed to use backend API:
  // return new BackendStorageService();
  return new LocalStorageService();
}

// Singleton instance
export const storageService = createStorageService();
