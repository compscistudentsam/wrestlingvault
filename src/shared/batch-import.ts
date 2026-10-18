export type BatchItem = {
  url: string;
  status: 'queued' | 'importing' | 'imported' | 'skipped' | 'failed' | 'cancelled';
  title?: string;
  message?: string;
};
export type BatchState = {
  running: boolean;
  stopping: boolean;
  items: BatchItem[];
};
