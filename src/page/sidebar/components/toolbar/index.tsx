import {
  Crosshair,
  FolderPlus,
  ListCheck,
  MessageSquarePlus,
  Move,
  RotateCw,
  Trash2,
  X,
} from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { Checkbox } from '@/components/Checkbox';
import { Separator } from '@/components/ui/Separator';
import { cn } from '@/lib/utils';
import { useSelectedCount, useSidebarStore } from '@/page/sidebar/store';
import { getBatchSelectionSummary } from '@/page/sidebar/store/utils';

import { ToolbarButton } from './Tooltip';

interface IProps {
  selectionMode: boolean;
  toggleSelectionMode: () => void;
  onDeselectAll: () => void;
  onBatchDelete: () => void;
  onBatchMove: () => void;
  onBatchCreate: () => void;
  onAddToChat: () => void;
  onLocateResource: () => void;
  locateResourceDisabled: boolean;
  onRefreshResources: () => void;
  refreshingResources: boolean;
}

export function Toolbar({
  selectionMode,
  toggleSelectionMode,
  onDeselectAll,
  onBatchDelete,
  onBatchMove,
  onBatchCreate,
  onAddToChat,
  onLocateResource,
  locateResourceDisabled,
  onRefreshResources,
  refreshingResources,
}: IProps) {
  const { t } = useTranslation();
  const selectedCount = useSelectedCount();
  const selectedIds = useSidebarStore(state => state.selectedIds);
  const nodes = useSidebarStore(state => state.nodes);
  const rootIds = useSidebarStore(state => state.rootIds);
  const allTopLevelIds = Object.values(rootIds).flatMap(
    rootId => nodes[rootId]?.children ?? []
  );
  const selectedTopLevelCount = allTopLevelIds.filter(
    id => selectedIds[id]
  ).length;
  const checked =
    allTopLevelIds.length > 0 && selectedTopLevelCount === allTopLevelIds.length
      ? true
      : selectedCount > 0
        ? 'indeterminate'
        : false;
  const disabledLabel =
    selectedCount <= 0 ? t('batch.select_required') : undefined;
  const batchSelection = getBatchSelectionSummary(nodes, selectedIds);
  const smartFolderUnsupportedLabel = batchSelection.hasSmartFolder
    ? t('batch.smart_folder_unsupported_action')
    : undefined;

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
          <span
            className={cn(
              'text-sm text-neutral-500',
              selectedCount <= 0
                ? 'text-neutral-500 dark:text-neutral-700'
                : 'text-muted-foreground dark:text-neutral-50'
            )}
          >
            {t('batch.selected_count', { count: selectedCount })}
          </span>
        </div>
      )}
      <React.Fragment key={selectionMode ? 'batch' : 'default'}>
        {selectionMode ? (
          <div className="flex items-center gap-1">
            <ToolbarButton
              icon={FolderPlus}
              onClick={onBatchCreate}
              label={t('batch.create_tooltip')}
              disabledLabel={disabledLabel || smartFolderUnsupportedLabel}
            />
            <ToolbarButton
              icon={Move}
              onClick={onBatchMove}
              label={t('batch.move_tooltip')}
              disabledLabel={disabledLabel || smartFolderUnsupportedLabel}
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
            <Separator
              orientation="vertical"
              className="h-4 bg-[#8F959E] dark:bg-neutral-400"
            />
            <ToolbarButton
              icon={X}
              onClick={onDeselectAll}
              label={t('batch.exit_tooltip')}
            />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <ToolbarButton
              icon={Crosshair}
              onClick={onLocateResource}
              label={t('actions.locate_resource')}
              disabledLabel={
                locateResourceDisabled
                  ? t('actions.locate_resource_unavailable')
                  : undefined
              }
            />
            <ToolbarButton
              icon={RotateCw}
              onClick={onRefreshResources}
              label={t('actions.refresh')}
              loading={refreshingResources}
            />
            <ToolbarButton
              icon={ListCheck}
              onClick={toggleSelectionMode}
              label={t('batch.multi_select')}
            />
          </div>
        )}
      </React.Fragment>
    </div>
  );
}
