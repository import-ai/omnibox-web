import { TaskType } from '@/interface.ts';

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
];

export const DISPLAY_FUNCTIONS = CONTENT_MODIFYING_FUNCTIONS;
