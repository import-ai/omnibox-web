import { FilePlus, FolderPlus, MonitorUp, MoreHorizontal } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/tooltip';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { Spinner } from '@/components/ui/spinner';
import { useIsTouch } from '@/hooks/use-is-touch';
import { SpaceType } from '@/interface';
import { cn } from '@/lib/utils';
import { useSpaceDrop } from '@/page/sidebar/hooks/use-space-drop';
import type { TreeNode } from '@/page/sidebar/store';
import { useSidebarStore } from '@/page/sidebar/store';
import { triggerGlobalFileUpload } from '@/page/sidebar/utils';

import ResourceNode from './resource-node';
import { menuIconClass, menuItemClass } from './shared';

interface SpaceSectionContentProps {
  rootNode: TreeNode;
  spaceType: SpaceType;
  namespaceId: string;
  rootId: string;
  isOpen: boolean;
}

export function SpaceSectionContent({
  rootNode,
  spaceType,
  namespaceId,
  rootId,
  isOpen,
}: SpaceSectionContentProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isTouch = useIsTouch();

  const groupRef = useRef<HTMLDivElement>(null);

  const upload = useSidebarStore(s => s.dialogs.upload[rootId]);

  const handleCreateFolder = () => {
    useSidebarStore.getState().openCreateFolderDialog(rootId);
  };

  const {
    ref: dropRef,
    isOver,
    canDrop,
    isFileDragOver,
  } = useSpaceDrop({
    spaceId: rootId,
    namespaceId,
  });

  useEffect(() => {
    groupRef.current = dropRef.current;
  }, [dropRef]);

  const handleHeaderToggle = () => {
    useSidebarStore.getState().toggleSpace(spaceType);
  };

  const handleUploadClick = () => {
    triggerGlobalFileUpload(rootId);
  };

  const handleCreateFile = () => {
    useSidebarStore
      .getState()
      .create(rootId, 'doc')
      .then(id => {
        useSidebarStore.getState().activate(id);
        navigate(`/${namespaceId}/${id}/edit`, {
          state: { fromSidebar: true },
        });
      })
      .catch(err => {
        toast.error(err?.message || t('create.failed'));
      });
  };

  return (
    <SidebarGroup
      ref={groupRef}
      className={cn('pr-0', {
        'bg-sidebar-border text-sidebar-accent-foreground':
          isFileDragOver || (canDrop && isOver),
      })}
    >
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <SidebarMenuButton className="group/sidebar-header h-8 pb-px pt-0">
            <div className="relative size-full">
              <SidebarGroupLabel
                onClick={handleHeaderToggle}
                className="mr-4 block h-full font-normal leading-8 text-neutral-400"
              >
                {spaceType ? t(spaceType) : ''}
              </SidebarGroupLabel>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  {upload !== undefined ? (
                    <SidebarMenuAction
                      asChild
                      className="pointer-events-none right-0 top-px my-1.5 size-4 text-neutral-400 focus-visible:outline-none focus-visible:ring-transparent group-hover/sidebar-header:pointer-events-auto"
                    >
                      <span>
                        {upload ? (
                          <TooltipProvider>
                            <Tooltip delayDuration={0}>
                              <TooltipTrigger asChild>
                                <span className="[&>svg]:size-4">
                                  <Spinner />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>{upload}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span>
                            <Spinner />
                          </span>
                        )}
                      </span>
                    </SidebarMenuAction>
                  ) : (
                    <SidebarMenuAction
                      asChild
                      className={cn(
                        'right-0 top-0.5 my-1.5 size-4 text-neutral-400 hover:bg-transparent focus-visible:outline-none focus-visible:ring-transparent',
                        isTouch
                          ? 'pointer-events-auto opacity-100'
                          : 'pointer-events-none opacity-0 group-hover/sidebar-header:pointer-events-auto group-hover/sidebar-header:opacity-100'
                      )}
                    >
                      <MoreHorizontal className="rounded-sm hover:bg-[#DFDFE3] focus-visible:outline-none focus-visible:ring-transparent" />
                    </SidebarMenuAction>
                  )}
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" sideOffset={10} align="start">
                  <DropdownMenuItem
                    className={menuItemClass}
                    onClick={handleCreateFile}
                  >
                    <FilePlus className={menuIconClass} />
                    {t('actions.create_file')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className={menuItemClass}
                    onClick={handleCreateFolder}
                  >
                    <FolderPlus className={menuIconClass} />
                    {t('actions.create_folder')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className={menuItemClass}
                    onClick={handleUploadClick}
                  >
                    <MonitorUp className={menuIconClass} />
                    {t('actions.upload_file')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </SidebarMenuButton>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem className={menuItemClass} onClick={handleCreateFile}>
            <FilePlus className={menuIconClass} />
            {t('actions.create_file')}
          </ContextMenuItem>
          <ContextMenuItem
            className={menuItemClass}
            onClick={handleCreateFolder}
          >
            <FolderPlus className={menuIconClass} />
            {t('actions.create_folder')}
          </ContextMenuItem>
          <ContextMenuItem
            className={menuItemClass}
            onClick={handleUploadClick}
          >
            <MonitorUp className={menuIconClass} />
            {t('actions.upload_file')}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      {isOpen && (
        <SidebarGroupContent>
          <SidebarMenu className="gap-0.5">
            {rootNode.hasChildren &&
              rootNode.children.length > 0 &&
              rootNode.children.map(childId => (
                <ResourceNode nodeId={childId} key={childId} />
              ))}
          </SidebarMenu>
        </SidebarGroupContent>
      )}
    </SidebarGroup>
  );
}
