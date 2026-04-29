import {
  FolderPlus,
  MessageSquarePlus,
  Move,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSelectedCount } from '@/page/sidebar/store';

interface BatchToolbarProps {
  onDeselectAll: () => void;
  onBatchDelete: () => void;
  onBatchMove: () => void;
  onBatchRefresh: () => void;
  onBatchCreate: () => void;
  onAddToChat: () => void;
}

export default function BatchToolbar({
  onDeselectAll,
  onBatchDelete,
  onBatchMove,
  onBatchRefresh,
  onBatchCreate,
  onAddToChat,
}: BatchToolbarProps) {
  const { t } = useTranslation();
  const selectedCount = useSelectedCount();

  return (
    <div
      className={cn(
        'flex items-center justify-between border-t border-border bg-sidebar px-3 py-2.5',
        'animate-in slide-in-from-bottom-2 duration-200'
      )}
    >
      <span className="text-sm font-medium text-foreground">
        {t('batch.selected_count', { count: selectedCount })}
      </span>
      <div className="flex items-center gap-1">
        <ToolbarButton
          label={t('batch.refresh_tooltip')}
          onClick={onBatchRefresh}
          icon={RefreshCw}
        />
        <ToolbarButton
          label={t('batch.create_tooltip')}
          onClick={onBatchCreate}
          icon={FolderPlus}
        />
        <ToolbarButton
          label={t('batch.add_to_chat_tooltip')}
          onClick={onAddToChat}
          icon={MessageSquarePlus}
        />
        <ToolbarButton
          label={t('batch.move_tooltip')}
          onClick={onBatchMove}
          icon={Move}
        />
        <ToolbarButton
          label={t('batch.delete_tooltip')}
          onClick={onBatchDelete}
          icon={Trash2}
          destructive
        />
        <div className="mx-1 h-5 w-px bg-border" />
        <ToolbarButton
          label={t('batch.deselect_tooltip')}
          onClick={onDeselectAll}
          icon={X}
        />
      </div>
    </div>
  );
}

interface ToolbarButtonProps {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  destructive?: boolean;
}

function ToolbarButton({
  label,
  icon: Icon,
  onClick,
  destructive,
}: ToolbarButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className={cn(
            'size-8 text-muted-foreground hover:text-foreground',
            destructive && 'hover:text-destructive'
          )}
          onClick={onClick}
          aria-label={label}
        >
          <Icon className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
