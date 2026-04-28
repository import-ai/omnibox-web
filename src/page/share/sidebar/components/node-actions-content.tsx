import { MoreHorizontal } from 'lucide-react';
import { useState } from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarMenuAction } from '@/components/ui/sidebar';
import { useIsTouch } from '@/hooks/use-is-touch';
import { cn } from '@/lib/utils';
import type { UseNodeActionsReturn } from '@/page/share/sidebar/hooks/use-node-actions';
import { useNodeMenu } from '@/page/share/sidebar/hooks/use-node-menu';

import { menuIconClass, menuItemClass } from './shared';

interface NodeActionsContentProps {
  actions: UseNodeActionsReturn;
}

export function NodeActionsContent({ actions }: NodeActionsContentProps) {
  const isTouch = useIsTouch();
  const [menuOpen, setMenuOpen] = useState(false);

  const menuItems = useNodeMenu(actions);

  return (
    <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
      <DropdownMenuTrigger asChild>
        <SidebarMenuAction
          asChild
          className={cn(
            'right-2 size-4 cursor-pointer !text-neutral-400 hover:bg-transparent hover:!text-sidebar-foreground focus-visible:outline-none focus-visible:ring-transparent peer-data-[size=default]/menu-button:top-2',
            isTouch
              ? 'pointer-events-auto opacity-100'
              : 'pointer-events-none opacity-0 group-hover/sidebar-item:pointer-events-auto group-hover/sidebar-item:opacity-100'
          )}
        >
          <MoreHorizontal className="cursor-pointer focus-visible:outline-none focus-visible:ring-transparent" />
        </SidebarMenuAction>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="start" sideOffset={10}>
        {menuItems.map(item => {
          if (item.separator) {
            return <DropdownMenuSeparator key={item.key} />;
          }

          const Icon = item.icon;
          return (
            <DropdownMenuItem
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
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
