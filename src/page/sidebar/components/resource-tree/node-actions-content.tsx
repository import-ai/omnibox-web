import { MoreHorizontal } from 'lucide-react';
import { useState } from 'react';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarMenuAction } from '@/components/ui/sidebar';
import { Spinner } from '@/components/ui/spinner';
import { useIsTouch } from '@/hooks/use-is-touch';
import { cn } from '@/lib/utils';
import MoveTo from '@/page/resource/actions/move';
import { menuIconClass, menuItemClass } from '@/page/sidebar/constants';
import type { UseNodeActionsReturn } from '@/page/sidebar/hooks/use-node-actions';
import { useNodeMenu } from '@/page/sidebar/hooks/use-node-menu';
import type { TreeNode } from '@/page/sidebar/store/types';

interface NodeActionsContentProps {
  nodeId: string;
  namespaceId: string;
  node: TreeNode;
  actions: UseNodeActionsReturn;
  upload?: string;
  onRename?: () => void;
}

export function NodeActionsContent({
  nodeId,
  namespaceId,
  node: _node,
  actions,
  upload,
  onRename,
}: NodeActionsContentProps) {
  const isTouch = useIsTouch();
  const [menuOpen, setMenuOpen] = useState(false);

  const menuItems = useNodeMenu(actions, 'dialog', () => {
    setMenuOpen(false);
    onRename?.();
  });

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          {upload !== undefined ? (
            <>
              {upload ? (
                <TooltipProvider>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <SidebarMenuAction className="pointer-events-none right-2 size-4 focus-visible:outline-none focus-visible:ring-transparent group-hover/sidebar-item:pointer-events-auto peer-data-[size=default]/menu-button:top-2">
                        <Spinner />
                      </SidebarMenuAction>
                    </TooltipTrigger>
                    <TooltipContent>{upload}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <SidebarMenuAction className="pointer-events-none right-2 size-4 focus-visible:outline-none focus-visible:ring-transparent group-hover/sidebar-item:pointer-events-auto peer-data-[size=default]/menu-button:top-2">
                  <Spinner />
                </SidebarMenuAction>
              )}
            </>
          ) : (
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
          )}
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
                <Icon
                  className={
                    item.destructive
                      ? 'size-4 text-neutral-500 group-hover:text-destructive dark:text-[#a1a1a1]'
                      : menuIconClass
                  }
                />
                {item.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      {actions.moveTo && (
        <MoveTo
          open={true}
          resourceId={nodeId}
          onOpenChange={actions.setMoveTo}
          namespaceId={namespaceId}
          onFinished={actions.handleMoveFinished}
        />
      )}
    </>
  );
}
