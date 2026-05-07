import {
  FolderPlus,
  MessageSquarePlus,
  Move,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import { ListCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useSelectedCount } from '@/page/sidebar/store';

import { ToolbarButton } from './tooltip';

interface IProps {
  selectionMode: boolean;
  toggleSelectionMode: () => void;
  onDeselectAll: () => void;
  onBatchDelete: () => void;
  onBatchMove: () => void;
  onBatchRefresh: () => void;
  onBatchCreate: () => void;
  onAddToChat: () => void;
}

export function Toolbar({
  selectionMode,
  toggleSelectionMode,
  onDeselectAll,
  onBatchDelete,
  onBatchMove,
  onBatchRefresh,
  onBatchCreate,
  onAddToChat,
}: IProps) {
  const { t } = useTranslation();
  const selectedCount = useSelectedCount();

  return (
    <div className="flex items-center justify-between px-2 pb-1">
      <span className="text-sm font-medium text-foreground">
        {selectionMode
          ? t('batch.selected_count', { count: selectedCount })
          : ''}
      </span>
      <div className="flex items-center gap-0">
        <ToolbarButton
          label={
            selectionMode
              ? t('batch.deselect_tooltip')
              : t('batch.multi_select')
          }
          onClick={toggleSelectionMode}
          icon={ListCheck}
        />
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
