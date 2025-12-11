import {
  FileUp,
  FolderSearch,
  MessageCircleX,
  SearchX,
  Star,
  Tag,
  TvMinimalPlay,
  Type,
} from 'lucide-react';
import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';

export type TaskType =
  | 'collect'
  | 'upsert_index'
  | 'delete_index'
  | 'file_reader'
  | 'message_index'
  | 'delete_conversation'
  | 'extract_tags'
  | 'generate_title'
  | 'generate_video_note';

interface TaskTagConfig {
  icon: ReactNode;
  translationKey: string;
}

const taskTagMap: Record<TaskType, TaskTagConfig> = {
  collect: {
    icon: <Star />,
    translationKey: 'tasks.functions.collect',
  },
  upsert_index: {
    icon: <FolderSearch />,
    translationKey: 'tasks.functions.index',
  },
  delete_index: {
    icon: <SearchX />,
    translationKey: 'tasks.functions.delete_index',
  },
  file_reader: {
    icon: <FileUp />,
    translationKey: 'tasks.functions.file_reader',
  },
  message_index: {
    icon: <FolderSearch />,
    translationKey: 'tasks.functions.message_index',
  },
  delete_conversation: {
    icon: <MessageCircleX />,
    translationKey: 'tasks.functions.delete_conversation',
  },
  extract_tags: {
    icon: <Tag />,
    translationKey: 'tasks.functions.extract_tags',
  },
  generate_title: {
    icon: <Type />,
    translationKey: 'tasks.functions.generate_title',
  },
  generate_video_note: {
    icon: <TvMinimalPlay />,
    translationKey: 'tasks.functions.generate_video_note',
  },
};

interface TaskTagProps {
  type: TaskType;
  variant?: 'outline';
}

export function TaskTag({ type, variant = 'outline' }: TaskTagProps) {
  const { t } = useTranslation();
  const config = taskTagMap[type];

  if (!config) {
    return null;
  }

  return (
    <Button
      variant={variant}
      className="h-6 rounded-[8px] gap-[2px] py-0 px-2 text-xs text-neutral-600 bg-transparent  dark:text-white"
    >
      {config.icon}
      {t(config.translationKey)}
    </Button>
  );
}
