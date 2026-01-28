import { TaskType } from '@/page/sidebar/switcher/manage/tasks/task-type-badge.tsx';

export const CONTENT_MODIFYING_FUNCTIONS: TaskType[] = [
  'collect',
  'collect_url',
  'upsert_index',
  'delete_index',
  'file_reader',
  'extract_tags',
  'generate_title',
  'generate_video_note',
];

export const DISPLAY_FUNCTIONS = CONTENT_MODIFYING_FUNCTIONS;
