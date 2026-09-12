/*
 * Copyright 2025-2026 Sentience Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const degreeToRadian = (degree: number): number => {
  return (degree * Math.PI) / 180;
};

const radianToDegree = (radian: number): number => {
  return (radian * 180) / Math.PI;
};

export {
    degreeToRadian,
    radianToDegree
};
