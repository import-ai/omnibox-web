import { TaskStatus, TaskType } from '@/interface.ts';

export const CONTENT_MODIFYING_FUNCTIONS: TaskType[] = [
  'collect',
  'collect_url',
  'web_analysis',
  'upsert_index',
  'delete_index',
  'file_reader',
  'file_reader_text',
  'file_reader_ppt',
  'file_reader_word',
  'file_reader_pdf',
  'file_reader_audio',
  'file_reader_video',
  'file_reader_image',
  'extract_tags',
  'generate_title',
  'generate_video_note',
  'generate_audio_note',
];

export const DISPLAY_FUNCTIONS = CONTENT_MODIFYING_FUNCTIONS;

export const FAILED_TASK_STATUSES: TaskStatus[] = [
  'error',
  'timeout',
  'insufficient_quota',
];

// Terminal statuses a retry can still do something about. A canceled task left
// the resource just as unprocessed as a failed one, so retrying must pick it up
// too. Mirrors RETRYABLE_TASK_STATUSES on the backend.
export const RETRYABLE_TASK_STATUSES: TaskStatus[] = [
  ...FAILED_TASK_STATUSES,
  'canceled',
];
