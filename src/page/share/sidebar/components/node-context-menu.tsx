import { useEffect, useState } from 'react';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { useNodeActions } from '@/page/share/sidebar/hooks/use-node-actions';
import { useNodeMenu } from '@/page/share/sidebar/hooks/use-node-menu';

import { ResourceTreeProps } from './resource-node';
import { menuIconClass, menuItemClass } from './shared';

interface NodeContextMenuProps extends Pick<
  ResourceTreeProps,
  'isChatActive' | 'onAddToContext'
> {
  nodeId: string;
  shareId: string;
  showChat: boolean;
  children: React.ReactNode;
}

export default function NodeContextMenu({
  nodeId,
  shareId,
  showChat,
  isChatActive,
  onAddToContext,
  children,
}: NodeContextMenuProps) {
  const [contextOpen, setContextOpen] = useState(false);

  useEffect(() => {
    if (contextOpen) {
      setContextOpen(false);
    }
  }, [contextOpen]);

  const actions = useNodeActions({
    nodeId,
    shareId,
    isChatActive,
    onAddToContext,
  });
  const { node } = actions;

  if (!node) {
    return children;
  }

  if (!showChat) {
    return children;
  }

  const menuItems = useNodeMenu(actions);

  return (
    <ContextMenu onOpenChange={setContextOpen}>
      <ContextMenuTrigger>{children}</ContextMenuTrigger>
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
              {Icon && (
                <Icon
                  className={
                    item.destructive
                      ? 'size-4 text-neutral-500 group-hover:text-destructive dark:text-[#a1a1a1]'
                      : menuIconClass
                  }
                />
              )}
              {item.label}
            </ContextMenuItem>
          );
        })}
      </ContextMenuContent>
    </ContextMenu>
  );
}
