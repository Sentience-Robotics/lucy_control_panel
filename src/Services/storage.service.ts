import type { JointControlState } from '../Constants/robotTypes';

export interface SavedPose {
  id: string;
  name: string;
  timestamp: number;
  joints: Record<string, number>; // joint name -> value mapping
  categoryOrder?: string[]; // optional category arrangement
}

export interface StorageService {
  savePose(name: string, joints: JointControlState[], categoryOrder?: string[]): Promise<SavedPose>;
  loadPoses(): Promise<SavedPose[]>;
  deletePose(id: string): Promise<void>;
  loadPose(id: string): Promise<SavedPose | null>;
}

// localStorage-based implementation
class LocalStorageService implements StorageService {
  private readonly POSES_KEY = 'lucy_poses';

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

  async savePose(name: string, joints: JointControlState[], categoryOrder?: string[]): Promise<SavedPose> {
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
      joints: jointValues,
      categoryOrder: categoryOrder
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

  async deletePose(id: string): Promise<void> {
    const poses = this.loadPosesFromStorage();
    const filteredPoses = poses.filter(pose => pose.id !== id);
    this.savePosesToStorage(filteredPoses);
  }

  async loadPose(id: string): Promise<SavedPose | null> {
    const poses = this.loadPosesFromStorage();
    return poses.find(pose => pose.id === id) || null;
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