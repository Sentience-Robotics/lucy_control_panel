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

// Cookie-based implementation with one cookie per pose
class CookieStorageService implements StorageService {
  private readonly POSE_PREFIX = 'lucy_pose_';
  private readonly INDEX_KEY = 'lucy_pose_index';
  private readonly MAX_COOKIE_SIZE = 4000; // Stay under 4KB limit per cookie

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private getPoseIndex(): string[] {
    try {
      const indexCookie = document.cookie
        .split('; ')
        .find(row => row.startsWith(`${this.INDEX_KEY}=`))
        ?.split('=')[1];

      if (!indexCookie) return [];

      const decoded = decodeURIComponent(indexCookie);
      return JSON.parse(decoded);
    } catch (error) {
      console.warn('Failed to load pose index from cookie:', error);
      return [];
    }
  }

  private setPoseIndex(poseIds: string[]): void {
    try {
      const jsonString = JSON.stringify(poseIds);
      const encoded = encodeURIComponent(jsonString);
      document.cookie = `${this.INDEX_KEY}=${encoded}; path=/; max-age=${60 * 60 * 24 * 30}`; // 30 days
    } catch (error) {
      console.error('Failed to save pose index:', error);
      throw error;
    }
  }

  private getPoseCookie(poseId: string): SavedPose | null {
    try {
      const cookieValue = document.cookie
        .split('; ')
        .find(row => row.startsWith(`${this.POSE_PREFIX}${poseId}=`))
        ?.split('=')[1];

      if (!cookieValue) return null;

      const decoded = decodeURIComponent(cookieValue);
      return JSON.parse(decoded);
    } catch (error) {
      console.warn(`Failed to load pose ${poseId} from cookie:`, error);
      return null;
    }
  }

  private setPoseCookie(pose: SavedPose): void {
    try {
      const jsonString = JSON.stringify(pose);
      const encoded = encodeURIComponent(jsonString);

      if (encoded.length > this.MAX_COOKIE_SIZE) {
        throw new Error(`Pose "${pose.name}" data too large for cookie storage`);
      }

      document.cookie = `${this.POSE_PREFIX}${pose.id}=${encoded}; path=/; max-age=${60 * 60 * 24 * 30}`; // 30 days
    } catch (error) {
      console.error('Failed to save pose to cookie:', error);
      throw error;
    }
  }

  private deletePoseCookie(poseId: string): void {
    document.cookie = `${this.POSE_PREFIX}${poseId}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }

    async savePose(name: string, joints: JointControlState[], categoryOrder?: string[]): Promise<SavedPose> {
    const existingPoses = await this.loadPoses();

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

    // Save the pose to its own cookie
    this.setPoseCookie(newPose);

    // Update the index
    const poseIndex = this.getPoseIndex();
    poseIndex.push(newPose.id);
    this.setPoseIndex(poseIndex);

    return newPose;
  }

  async loadPoses(): Promise<SavedPose[]> {
    const poseIndex = this.getPoseIndex();
    const poses: SavedPose[] = [];

    // Load each pose from its individual cookie
    for (const poseId of poseIndex) {
      const pose = this.getPoseCookie(poseId);
      if (pose) {
        poses.push(pose);
      } else {
        // Remove invalid pose ID from index
        console.warn(`Pose ${poseId} not found, removing from index`);
      }
    }

    // Clean up index to remove any invalid pose IDs
    const validPoseIds = poses.map(p => p.id);
    if (validPoseIds.length !== poseIndex.length) {
      this.setPoseIndex(validPoseIds);
    }

    return poses.sort((a, b) => b.timestamp - a.timestamp);
  }

  async deletePose(id: string): Promise<void> {
    // Delete the pose cookie
    this.deletePoseCookie(id);

    // Remove from index
    const poseIndex = this.getPoseIndex();
    const filteredIndex = poseIndex.filter(poseId => poseId !== id);
    this.setPoseIndex(filteredIndex);
  }

  async loadPose(id: string): Promise<SavedPose | null> {
    return this.getPoseCookie(id);
  }
}

// Factory function to create storage service
// This makes it easy to swap implementations later
export function createStorageService(): StorageService {
  // For now, use cookie storage
  // Later, this can be changed to use backend API:
  // return new BackendStorageService();
  return new CookieStorageService();
}

// Singleton instance
export const storageService = createStorageService();