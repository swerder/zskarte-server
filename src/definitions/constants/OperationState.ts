export const OperationStates = {
  ACTIVE: 'active',
  ARCHIVED: 'archived',
} as const;
export type OperationState = (typeof OperationStates)[keyof typeof OperationStates];
