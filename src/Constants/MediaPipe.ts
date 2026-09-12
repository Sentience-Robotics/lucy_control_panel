/*
 * Copyright 2025-2026 Sentience Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Options } from "@mediapipe/hands";

export const MEDIAPIPE_HANDS_URL: string = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/';

export const HANDS_MODEL_CONFIG: Options = {
    maxNumHands: 2,
    modelComplexity: 1,
    selfieMode: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
}

export enum ControlMode {
    Fingers = "fingers",
    Claw = "claw",
}

/** Robot packages driven by a single gripper joint; every other package uses per-finger tracking. */
const CLAW_ROBOT_PACKAGES: ReadonlySet<string> = new Set(["so_arm101_urdf"]);

export const DEFAULT_CONTROL_MODE: ControlMode = ControlMode.Fingers;

/** Control mode for the robot package loaded on the pipeline; falls back while none is known. */
export function controlModeForRobotPackage(robotPackage: string): ControlMode {
    const pkg = robotPackage.trim();
    if (!pkg) return DEFAULT_CONTROL_MODE;
    return CLAW_ROBOT_PACKAGES.has(pkg) ? ControlMode.Claw : ControlMode.Fingers;
}
