export type Task = {
  run(params?: any): Promise<void>;
};

export enum TaskTitle {
  DETECT_OUTDATED = 'detectOutdated',
  DETECT_CONFLICT = 'detectConflict',
  SYNC_OUTDATED = 'syncOutdated',
  REMOVE_SOFT_DELETE_BAL = 'removeSoftDeleteBal',
  REMOVE_DEMO_BAL = 'removeDemoBal',
  UPLOAD_TRACES = 'uploadTraces',
}

export enum Priority {
  HIGHT = 1,
  LOW = 2,
}
