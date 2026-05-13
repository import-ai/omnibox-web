import {
  FolderPlus,
  ListCheck,
  MessageSquarePlus,
  Move,
  Trash2,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useSelectedCount } from '@/page/sidebar/store';
import { useSidebarStore } from '@/page/sidebar/store';

import { ToolbarButton } from './tooltip';

interface IProps {
  selectionMode: boolean;
  toggleSelectionMode: () => void;
  onDeselectAll: () => void;
  onBatchDelete: () => void;
  onBatchMove: () => void;
  onBatchCreate: () => void;
  onAddToChat: () => void;
}

export function Toolbar({
  selectionMode,
  toggleSelectionMode,
  onDeselectAll,
  onBatchDelete,
  onBatchMove,
  onBatchCreate,
  onAddToChat,
}: IProps) {
  const { t } = useTranslation();
  const selectedCount = useSelectedCount();
  const selectedIds = useSidebarStore(state => state.selectedIds);
  const nodes = useSidebarStore(state => state.nodes);
  const rootIds = useSidebarStore(state => state.rootIds);
  const allTopLevelIds = Object.values(rootIds).flatMap(
    rootId => nodes[rootId]?.children ?? []
  );
  const selectedTopLevelCount = allTopLevelIds.filter(id =>
    Boolean(selectedIds[id])
  ).length;
  const checked =
    allTopLevelIds.length > 0 && selectedTopLevelCount === allTopLevelIds.length
      ? true
      : selectedCount > 0
        ? 'indeterminate'
        : false;
  const disabledLabel =
    selectedCount === 0 ? t('batch.select_required') : undefined;

  const handleCheckAll = () => {
    const store = useSidebarStore.getState();
    if (checked === true) {
      store.clearSelection();
    } else {
      store.selectAll();
    }
  };

  return (
    <div
      className={cn('flex items-center justify-end pl-4 pr-1 min-h-5', {
        'justify-between': selectionMode,
      })}
    >
      {selectionMode && (
        <div className="flex items-center gap-2">
          <Checkbox
            checked={checked}
            onClick={handleCheckAll}
            aria-label={t('batch.multi_select')}
          />
          <span className="text-sm text-neutral-500">
            {t('batch.selected_count', { count: selectedCount })}
          </span>
        </div>
      )}
      <div className="flex items-center gap-1">
        {selectionMode ? (
          <>
            <ToolbarButton
              icon={FolderPlus}
              onClick={onBatchCreate}
              label={t('batch.create_tooltip')}
              disabledLabel={disabledLabel}
            />
            <ToolbarButton
              icon={Move}
              onClick={onBatchMove}
              label={t('batch.move_tooltip')}
              disabledLabel={disabledLabel}
            />
            <ToolbarButton
              icon={MessageSquarePlus}
              onClick={onAddToChat}
              label={t('batch.add_to_chat_tooltip')}
              disabledLabel={disabledLabel}
            />
            <ToolbarButton
              icon={Trash2}
              onClick={onBatchDelete}
              label={t('batch.delete_tooltip')}
              disabledLabel={disabledLabel}
            />
            <Separator orientation="vertical" className="h-4 bg-neutral-300" />
            <ToolbarButton
              icon={X}
              onClick={onDeselectAll}
              label={t('batch.exit_tooltip')}
            />
          </>
        ) : (
          <ToolbarButton
            icon={ListCheck}
            onClick={toggleSelectionMode}
            label={t('batch.multi_select')}
          />
        )}
      </div>
    </div>
  );
}
