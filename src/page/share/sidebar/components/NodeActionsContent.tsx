import { MoreHorizontal } from 'lucide-react';
import { useState } from 'react';

import { sidebarToolbarIconButtonClassName } from '@/components/omnibox/IconButton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { SidebarMenuAction } from '@/components/ui/Sidebar';
import { useIsTouch } from '@/hooks/useIsTouch';
import { cn } from '@/lib/utils';
import type { UseNodeActionsReturn } from '@/page/share/sidebar/hooks/useNodeActions';
import { useNodeMenu } from '@/page/share/sidebar/hooks/useNodeMenu';
import { useMenuTriggerPress } from '@/page/sidebar/components/resource-tree/menuTriggerPress';

import { menuIconClass, menuItemClass } from './shared';

interface NodeActionsContentProps {
  actions: UseNodeActionsReturn;
}

export function NodeActionsContent({ actions }: NodeActionsContentProps) {
  const isTouch = useIsTouch();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuTriggerPress = useMenuTriggerPress();

  const menuItems = useNodeMenu(actions);

  return (
    <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
      <DropdownMenuTrigger asChild {...menuTriggerPress.triggerProps}>
        <SidebarMenuAction
          asChild
          className={cn(
            sidebarToolbarIconButtonClassName,
            'right-2 size-4 cursor-pointer focus-visible:outline-hidden focus-visible:ring-transparent peer-data-[size=default]/menu-button:top-2',
            isTouch
              ? 'pointer-events-auto opacity-100'
              : 'pointer-events-none opacity-0 group-hover/sidebar-item:pointer-events-auto group-hover/sidebar-item:opacity-100'
          )}
        >
          <button type="button">
            <MoreHorizontal />
          </button>
        </SidebarMenuAction>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="right"
        align="start"
        sideOffset={10}
        className="w-auto! min-w-36"
        {...menuTriggerPress.contentProps}
      >
        {menuItems.map(item => {
          if (item.separator) {
            return <DropdownMenuSeparator key={item.key} />;
          }

          const Icon = item.icon;
          return (
            <DropdownMenuItem
              key={item.key}
              variant={item.destructive ? 'destructive' : 'default'}
              className={menuItemClass}
              onClick={item.onClick}
              onSelect={item.onSelect}
            >
              {Icon && <Icon className={menuIconClass} />}
              {item.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
