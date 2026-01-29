import {
  FileText,
  FileUp,
  FolderSearch2,
  Globe,
  MessageCircleX,
  SearchX,
  Star,
  Tag,
  TvMinimalPlay,
  Type,
} from 'lucide-react';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { TaskType } from '@/interface.ts';

interface TaskTypeBadgeProps {
  functionName: TaskType;
}

export const taskTypeConfig: Record<
  TaskType,
  {
    icon: React.ComponentType<{
      className?: string;
      style?: React.CSSProperties;
    }>;
    labelKey: string;
  }
> = {
  upsert_index: {
    icon: FolderSearch2,
    labelKey: 'tasks.functions.upsert_index',
  },
  extract_tags: {
    icon: Tag,
    labelKey: 'tasks.functions.extract_tags',
  },
  upsert_message_index: {
    icon: FolderSearch2,
    labelKey: 'tasks.functions.upsert_message_index',
  },
  delete_conversation: {
    icon: MessageCircleX,
    labelKey: 'tasks.functions.delete_conversation',
  },
  generate_title: {
    icon: Type,
    labelKey: 'tasks.functions.generate_title',
  },
  delete_index: {
    icon: SearchX,
    labelKey: 'tasks.functions.delete_index',
  },
  file_reader: {
    icon: FileUp,
    labelKey: 'tasks.functions.file_reader',
  },
  collect: {
    icon: Star,
    labelKey: 'tasks.functions.collect',
  },
  generate_video_note: {
    icon: TvMinimalPlay,
    labelKey: 'tasks.functions.generate_video_note',
  },
  collect_url: {
    icon: Globe,
    labelKey: 'tasks.functions.collect_url',
  },
};

export function TaskTypeBadge({ functionName }: TaskTypeBadgeProps) {
  const { t } = useTranslation();
  const config = taskTypeConfig[functionName] || {
    icon: FileText,
    labelKey: `tasks.functions.${functionName}`,
  };
  const Icon = config.icon;
  const label = t(config.labelKey);
  const displayLabel = label !== config.labelKey ? label : functionName;

  return (
    <div className="inline-flex h-6 items-center gap-0.5 rounded-lg border border-border px-2 py-0.5">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">
        {displayLabel}
      </span>
    </div>
  );
}
