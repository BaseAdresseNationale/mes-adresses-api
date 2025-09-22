export type Task = {
  run(params?: any): Promise<void>;
};

export enum TaskTitle {
  DETECT_OUTDATED = 'detectOutdated',
  DETECT_CONFLICT = 'detectConflict',
  SYNC_OUTDATED = 'syncOutdated',
  FORCE_PUBLISH = 'forcePublish',
  REMOVE_SOFT_DELETE_BAL = 'removeSoftDeleteBal',
  REMOVE_DEMO_BAL = 'removeDemoBal',
  UPLOAD_TRACES = 'uploadTraces',
}

export enum PriorityEnum {
  HIGH = 1,
  LOW = 2,
}
