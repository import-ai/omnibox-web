import { useEffect, useState } from 'react';
import { useDragLayer } from 'react-dnd';

import { BehaviorExposure } from '@/components/BehaviorExposure';
import { ContextMenuContent } from '@/components/ContextMenuContent';
import {
  ContextMenu,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/ContextMenu';
import { cn } from '@/lib/utils';
import MoveTo from '@/page/resource/actions/move';
import { useNodeActions } from '@/page/sidebar/hooks/useNodeActions';
import {
  BatchMenuActions,
  useNodeMenu,
} from '@/page/sidebar/hooks/useNodeMenu';

import { DisabledMenuTooltip } from './DisabledMenuTooltip';
import { menuIconClass, menuItemClass } from './shared';

interface NodeContextMenuProps {
  nodeId: string;
  namespaceId: string;
  children: React.ReactNode;
  onRename?: () => void;
  batchActions?: BatchMenuActions;
}

export default function NodeContextMenu({
  nodeId,
  namespaceId,
  children,
  onRename,
  batchActions,
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

  const menu = useNodeMenu(
    actions,
    () => {
      setContextOpen(false);
      window.setTimeout(() => {
        onRename?.();
      }, 150);
    },
    batchActions
  );

  return (
    <>
      <ContextMenu open={contextOpen} onOpenChange={setContextOpen}>
        <ContextMenuTrigger disabled={isActuallyDragging}>
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent
          className={cn(menu.disabledTip && 'cursor-not-allowed')}
        >
          <DisabledMenuTooltip side="top" content={menu.disabledTip}>
            <div className={cn(menu.disabledTip && 'cursor-not-allowed')}>
              {menu.items.map(item => {
                if (item.separator) {
                  return <ContextMenuSeparator key={item.key} />;
                }

                const Icon = item.icon;
                const menuItem = (
                  <BehaviorExposure
                    key={item.key}
                    target="resource_creation_entry"
                    active={[
                      'create_file',
                      'create_folder',
                      'create_rss_folder',
                      'upload_file',
                      'add_link',
                    ].includes(item.key)}
                    props={{
                      entry: item.key,
                      space_type: node.spaceType,
                      location: 'child_context_menu',
                    }}
                  >
                    <ContextMenuItem
                      key={item.key}
                      variant={item.destructive ? 'destructive' : 'default'}
                      className={cn(
                        menuItemClass,
                        item.disabled &&
                          'cursor-not-allowed text-muted-foreground opacity-50'
                      )}
                      onClick={item.disabled ? undefined : item.onClick}
                      onSelect={item.onSelect}
                      disabled={item.disabled && !item.disabledTip}
                      aria-disabled={item.disabled}
                    >
                      <Icon className={menuIconClass} />
                      {item.label}
                    </ContextMenuItem>
                  </BehaviorExposure>
                );

                if (item.disabled && item.disabledTip) {
                  return (
                    <DisabledMenuTooltip
                      side="top"
                      key={item.key}
                      content={item.disabledTip}
                    >
                      {menuItem}
                    </DisabledMenuTooltip>
                  );
                }

                return menuItem;
              })}
            </div>
          </DisabledMenuTooltip>
        </ContextMenuContent>
      </ContextMenu>
      {actions.moveTo && (
        <>
          <MoveTo
            open={true}
            resourceIds={[nodeId]}
            onOpenChange={actions.setMoveTo}
            namespaceId={namespaceId}
            sourceResourceType={node.resourceType}
            onFinished={actions.handleMoveFinished}
          />
        </>
      )}
    </>
  );
}
