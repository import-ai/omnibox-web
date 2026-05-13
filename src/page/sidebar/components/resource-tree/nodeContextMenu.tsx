import { useEffect, useState } from 'react';
import { useDragLayer } from 'react-dnd';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import MoveTo from '@/page/resource/actions/move';
import { useNodeActions } from '@/page/sidebar/hooks/useNodeActions';
import { useNodeMenu } from '@/page/sidebar/hooks/useNodeMenu';
import { useSidebarStore } from '@/page/sidebar/store';

import { menuIconClass, menuItemClass } from './shared';

interface NodeContextMenuProps {
  nodeId: string;
  namespaceId: string;
  children: React.ReactNode;
  onRename?: () => void;
}

export default function NodeContextMenu({
  nodeId,
  namespaceId,
  children,
  onRename,
}: NodeContextMenuProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [contextOpen, setContextOpen] = useState(false);

  const { isActuallyDragging } = useDragLayer(monitor => {
    const isDragging = monitor.isDragging();
    const diff = monitor.getDifferenceFromInitialOffset();
    const hasMoved = diff
      ? Math.abs(diff.x) > 5 || Math.abs(diff.y) > 5
      : false;
    return {
      isActuallyDragging: isDragging && hasMoved,
    };
  });

  useEffect(() => {
    if (isActuallyDragging && contextOpen) {
      setContextOpen(false);
    }
  }, [isActuallyDragging, contextOpen]);

  const actions = useNodeActions(nodeId, namespaceId);
  const { node } = actions;

  if (!node) {
    return children;
  }

  const menuItems = useNodeMenu(actions, 'direct', () => {
    setContextOpen(false);
    window.setTimeout(() => {
      onRename?.();
    }, 150);
  });

  const handleBatchMenuClick = (key: string) => {
    const store = useSidebarStore.getState();

    if (key === 'batch_create') {
      store.setBatchCreateDialog(true);
      setContextOpen(false);
      return;
    }

    if (key === 'batch_add_to_chat') {
      const ids = Object.keys(store.selectedIds);
      store.addToChat(ids);
      toast.success(t('batch.add_to_chat_success', { count: ids.length }));
      if (!location.pathname.includes('/chat')) {
        navigate(`/${namespaceId}/chat`);
      }
      setContextOpen(false);
      return;
    }

    if (key === 'batch_move') {
      store.setBatchMoveDialog(true);
      setContextOpen(false);
      return;
    }

    if (key === 'batch_delete') {
      store.setBatchDeleteDialog(true);
      setContextOpen(false);
    }
  };

  const renderMenuItems = () => (
    <>
      {menuItems.items.map(item => {
        if (item.separator) {
          return <ContextMenuSeparator key={item.key} />;
        }

        const Icon = item.icon;
        return (
          <ContextMenuItem
            key={item.key}
            className={
              item.destructive
                ? 'group cursor-pointer gap-2 data-[highlighted]:text-destructive'
                : menuItemClass
            }
            disabled={item.disabled}
            onClick={
              item.key.startsWith('batch_')
                ? () => handleBatchMenuClick(item.key)
                : item.onClick
            }
            onSelect={item.onSelect}
          >
            <Icon
              className={
                item.destructive
                  ? 'size-4 text-neutral-500 group-hover:text-destructive dark:text-[#a1a1a1]'
                  : menuIconClass
              }
            />
            {item.label}
          </ContextMenuItem>
        );
      })}
    </>
  );

  return (
    <>
      <ContextMenu open={contextOpen} onOpenChange={setContextOpen}>
        <ContextMenuTrigger disabled={isActuallyDragging}>
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent>
          {menuItems.disabled ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div>{renderMenuItems()}</div>
              </TooltipTrigger>
              <TooltipContent>{t('batch.select_required')}</TooltipContent>
            </Tooltip>
          ) : (
            renderMenuItems()
          )}
        </ContextMenuContent>
      </ContextMenu>
      {actions.moveTo && (
        <>
          <MoveTo
            open={true}
            resourceIds={[nodeId]}
            onOpenChange={actions.setMoveTo}
            namespaceId={namespaceId}
            onFinished={actions.handleMoveFinished}
          />
        </>
      )}
    </>
  );
}
