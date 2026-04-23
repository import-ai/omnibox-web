import { useEffect, useState } from 'react';
import { useDragLayer } from 'react-dnd';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import MoveTo from '@/page/resource/actions/move';
import { menuIconClass, menuItemClass } from '@/page/sidebar/constants';
import { useNodeActions } from '@/page/sidebar/hooks/use-node-actions';
import { useNodeMenu } from '@/page/sidebar/hooks/use-node-menu';

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

  const menuItems = useNodeMenu(actions, 'direct', onRename);

  return (
    <>
      <ContextMenu onOpenChange={setContextOpen}>
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
            onFinished={actions.handleMoveFinished}
          />
        </>
      )}
    </>
  );
}
