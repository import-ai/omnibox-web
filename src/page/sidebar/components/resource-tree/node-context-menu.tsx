import { useEffect, useState } from 'react';
import { useDragLayer } from 'react-dnd';
import { useTranslation } from 'react-i18next';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Namespace } from '@/interface';
import MoveTo from '@/page/resource/actions/move';
import { CreateSmartFolderDialog } from '@/page/sidebar/content/create-smart-folder-dialog';
import { SmartFolderTrashConfirmDialog } from '@/page/sidebar/content/smart-folder-trash-confirm-dialog';
import { useNodeActions } from '@/page/sidebar/hooks/use-node-actions';
import { useNodeMenu } from '@/page/sidebar/hooks/use-node-menu';
import { useSidebarStore } from '@/page/sidebar/store';

import { menuIconClass, menuItemClass } from './shared';

interface NodeContextMenuProps {
  nodeId: string;
  namespaceId: string;
  children: React.ReactNode;
  hasTeamspace: boolean;
  currentNamespace?: Namespace;
  onRename?: () => void;
}

export default function NodeContextMenu({
  nodeId,
  namespaceId,
  children,
  hasTeamspace,
  currentNamespace,
  onRename,
}: NodeContextMenuProps) {
  const { t } = useTranslation();
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
  const nodes = useSidebarStore(state => state.nodes);

  if (!node) {
    return children;
  }
  const siblingResources =
    node.parentId && nodes[node.parentId]
      ? nodes[node.parentId].children
          .map(childId => nodes[childId])
          .filter(Boolean)
          .map(sibling => ({
            id: sibling.id,
            name: sibling.name,
            parent_id: sibling.parentId,
            resource_type: sibling.resourceType,
            has_children: sibling.hasChildren,
            attrs: sibling.attrs,
          }))
      : [];

  const menuItems = useNodeMenu(actions, 'direct', () => {
    setContextOpen(false);
    window.setTimeout(() => {
      onRename?.();
    }, 150);
  });

  return (
    <>
      <ContextMenu open={contextOpen} onOpenChange={setContextOpen}>
        <ContextMenuTrigger disabled={isActuallyDragging}>
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent>
          {menuItems.map(item => {
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
                onClick={item.onClick}
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
        </ContextMenuContent>
      </ContextMenu>
      {actions.moveTo && (
        <>
          <MoveTo
            open={true}
            resourceId={nodeId}
            onOpenChange={actions.setMoveTo}
            namespaceId={namespaceId}
            sourceResourceType={node.resourceType}
            onFinished={actions.handleMoveFinished}
          />
        </>
      )}
      {node.resourceType === 'smart_folder' && (
        <CreateSmartFolderDialog
          open={actions.smartFolderOpen}
          currentResourceId={nodeId}
          initialValue={actions.smartFolderInitial}
          title={t('smart_folder.edit.title')}
          confirmText={t('smart_folder.edit.submit')}
          hasTeamspace={hasTeamspace}
          currentNamespace={currentNamespace}
          siblingResources={siblingResources}
          onOpenChange={actions.setSmartFolderOpen}
          onConfirm={actions.handleUpdateSmartFolder}
        />
      )}
      {node.resourceType === 'smart_folder' && (
        <SmartFolderTrashConfirmDialog
          open={actions.smartFolderTrashOpen}
          retentionDays={actions.smartFolderRetentionDays}
          onOpenChange={actions.setSmartFolderTrashOpen}
          onConfirm={actions.handleConfirmSmartFolderDelete}
        />
      )}
    </>
  );
}
