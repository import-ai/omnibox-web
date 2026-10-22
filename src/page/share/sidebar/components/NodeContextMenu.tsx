import { useEffect, useState } from 'react';

import { ContextMenuContent } from '@/components/ContextMenuContent';
import {
  ContextMenu,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/ContextMenu';
import { useNodeActions } from '@/page/share/sidebar/hooks/useNodeActions';
import { useNodeMenu } from '@/page/share/sidebar/hooks/useNodeMenu';

import { ResourceTreeProps } from './ResourceNode';
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
              variant={item.destructive ? 'destructive' : 'default'}
              className={menuItemClass}
              onClick={item.onClick}
              onSelect={item.onSelect}
            >
              {Icon && <Icon className={menuIconClass} />}
              {item.label}
            </ContextMenuItem>
          );
        })}
      </ContextMenuContent>
    </ContextMenu>
  );
}
