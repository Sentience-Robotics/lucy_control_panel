export type WorkflowStepId = 'validate' | 'activate' | 'build' | 'flash';

export type WorkflowStepRuntimeStatus = 'pending' | 'running' | 'done' | 'error' | 'skipped';

export interface WorkflowStepSlice {
    id: WorkflowStepId;
    title: string;
    status: WorkflowStepRuntimeStatus;
    fraction: number;
    detail: string;
}
