import { MoreHorizontal } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

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
import { Namespace } from '@/interface';
import { cn } from '@/lib/utils';
import MoveTo from '@/page/resource/actions/move';
import { CreateSmartFolderDialog } from '@/page/sidebar/content/create-smart-folder-dialog';
import { SmartFolderTrashConfirmDialog } from '@/page/sidebar/content/smart-folder-trash-confirm-dialog';
import type { UseNodeActionsReturn } from '@/page/sidebar/hooks/use-node-actions';
import { useNodeMenu } from '@/page/sidebar/hooks/use-node-menu';
import { useSidebarStore } from '@/page/sidebar/store';
import type { TreeNode } from '@/page/sidebar/store/types';

import { menuIconClass, menuItemClass } from './shared';

interface NodeActionsContentProps {
  nodeId: string;
  namespaceId: string;
  node: TreeNode;
  actions: UseNodeActionsReturn;
  upload?: string;
  hasTeamspace: boolean;
  currentNamespace?: Namespace;
  onRename?: () => void;
}

export function NodeActionsContent({
  nodeId,
  namespaceId,
  node,
  actions,
  upload,
  hasTeamspace,
  currentNamespace,
  onRename,
}: NodeActionsContentProps) {
  const { t } = useTranslation();
  const isTouch = useIsTouch();
  const [menuOpen, setMenuOpen] = useState(false);
  const nodes = useSidebarStore(state => state.nodes);
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

  const menuItems = useNodeMenu(actions, 'dialog', () => {
    setMenuOpen(false);
    window.setTimeout(() => {
      onRename?.();
    }, 150);
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
          sourceResourceType={node.resourceType}
          onFinished={actions.handleMoveFinished}
        />
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
