import {
  FileText,
  Hash,
  MessageSquare,
  Search,
  Tags,
  Trash2,
  Video,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface TaskTypeBadgeProps {
  functionName: string;
}

const taskTypeConfig: Record<
  string,
  {
    icon: React.ComponentType<{
      className?: string;
      style?: React.CSSProperties;
    }>;
    labelKey: string;
  }
> = {
  upsert_index: {
    icon: Search,
    labelKey: 'tasks.functions.upsert_index',
  },
  extract_tags: {
    icon: Tags,
    labelKey: 'tasks.functions.extract_tags',
  },
  upsert_message_index: {
    icon: MessageSquare,
    labelKey: 'tasks.functions.upsert_message_index',
  },
  delete_conversation: {
    icon: Trash2,
    labelKey: 'tasks.functions.delete_conversation',
  },
  generate_title: {
    icon: FileText,
    labelKey: 'tasks.functions.generate_title',
  },
  delete_index: {
    icon: Hash,
    labelKey: 'tasks.functions.delete_index',
  },
  file_reader: {
    icon: FileText,
    labelKey: 'tasks.functions.file_reader',
  },
  collect: {
    icon: FileText,
    labelKey: 'tasks.functions.collect',
  },
  generate_video_note: {
    icon: Video,
    labelKey: 'tasks.functions.generate_video_note',
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
