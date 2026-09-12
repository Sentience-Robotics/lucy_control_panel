/*
 * Copyright 2025-2026 Sentience Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export type WorkflowStepId = 'validate' | 'activate' | 'generate' | 'build' | 'flash' | 'reload';

export type WorkflowStepRuntimeStatus = 'pending' | 'running' | 'done' | 'error' | 'skipped';

export interface WorkflowStepSlice {
    id: WorkflowStepId;
    title: string;
    status: WorkflowStepRuntimeStatus;
    fraction: number;
    detail: string;
}
