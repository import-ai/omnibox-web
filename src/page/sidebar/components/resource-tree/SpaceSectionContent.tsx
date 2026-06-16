import {
  ChevronRight,
  FilePlus,
  FolderPlus,
  MonitorUp,
  MoreHorizontal,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { SmartFolderDefaultIcon } from '@/assets/icons/SmartFolderDefaultIcon';
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
} from '@/components/ui/ContextMenu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/Sidebar';
import { Spinner } from '@/components/ui/Spinner';
import { useIsTouch } from '@/hooks/useIsTouch';
import { SpaceType } from '@/interface';
import { cn } from '@/lib/utils';
import type { SmartFolderOwnerScope } from '@/page/sidebar/components/smart-folder';
import { useSpaceDrop } from '@/page/sidebar/hooks/useSpaceDrop';
import type { TreeNode } from '@/page/sidebar/store';
import { useSidebarStore } from '@/page/sidebar/store';
import { triggerGlobalFileUpload } from '@/page/sidebar/utils';

import { DisabledMenuTooltip } from './DisabledMenuTooltip';
import ResourceNode from './ResourceNode';
import { menuIconClass, menuItemClass } from './shared';

interface SpaceSectionContentProps {
  rootNode: TreeNode;
  spaceType: SpaceType;
  namespaceId: string;
  rootId: string;
  isOpen: boolean;
  hasTeamspace: boolean;
  currentNamespace?: Namespace;
  onBatchDelete: () => void;
  onBatchMove: () => void;
  onBatchCreate: () => void;
  onAddToChat: () => void;
  onCreateSmartFolder: (ownerScope: SmartFolderOwnerScope) => void;
  smartFolderQuotaExhausted: Partial<Record<SmartFolderOwnerScope, boolean>>;
}

export function SpaceSectionContent({
  rootNode,
  spaceType,
  namespaceId,
  rootId,
  isOpen,
  hasTeamspace,
  currentNamespace,
  onBatchDelete,
  onBatchMove,
  onBatchCreate,
  onAddToChat,
  onCreateSmartFolder,
  smartFolderQuotaExhausted,
}: SpaceSectionContentProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isTouch = useIsTouch();

  const upload = useSidebarStore(s => s.dialogs.upload[rootId]);

  const handleCreateFolder = () => {
    useSidebarStore.getState().openCreateFolderDialog(rootId);
  };

  const smartFolderDisabled = smartFolderQuotaExhausted[spaceType] === true;
  const smartFolderDisabledTip = smartFolderDisabled
    ? t(
        spaceType === 'teamspace'
          ? 'smart_folder.create.team_quota_exhausted'
          : 'smart_folder.create.personal_quota_exhausted'
      )
    : undefined;

  const {
    ref: dropRef,
    isOver,
    canDrop,
    isFileDragOver,
  } = useSpaceDrop({
    spaceId: rootId,
    namespaceId,
  });

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
      .catch(() => {
        // request.ts handles backend error toasts.
      });
  };

  const handleCreateSmartFolder = () => {
    onCreateSmartFolder(spaceType);
  };

  return (
    <SidebarGroup
      ref={dropRef}
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
                className="mr-4 flex h-full items-center gap-1 font-normal leading-8 text-neutral-400"
              >
                {spaceType ? t(spaceType) : ''}
                <ChevronRight
                  className={cn(
                    '!size-3 shrink-0 dark:text-neutral-500 text-neutral-300 transition-transform',
                    isOpen && 'rotate-90'
                  )}
                />
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
                  <DisabledMenuTooltip content={smartFolderDisabledTip}>
                    <DropdownMenuItem
                      className={cn(
                        menuItemClass,
                        smartFolderDisabled &&
                          'cursor-not-allowed text-muted-foreground opacity-50'
                      )}
                      onClick={
                        smartFolderDisabled
                          ? undefined
                          : handleCreateSmartFolder
                      }
                      onSelect={event => {
                        if (smartFolderDisabled) {
                          event.preventDefault();
                        }
                      }}
                      aria-disabled={smartFolderDisabled}
                    >
                      <SmartFolderDefaultIcon className={menuIconClass} />
                      {t('actions.create_smart_folder')}
                    </DropdownMenuItem>
                  </DisabledMenuTooltip>
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
          <DisabledMenuTooltip content={smartFolderDisabledTip}>
            <ContextMenuItem
              className={cn(
                menuItemClass,
                smartFolderDisabled &&
                  'cursor-not-allowed text-muted-foreground opacity-50'
              )}
              onClick={
                smartFolderDisabled ? undefined : handleCreateSmartFolder
              }
              onSelect={event => {
                if (smartFolderDisabled) {
                  event.preventDefault();
                }
              }}
              aria-disabled={smartFolderDisabled}
            >
              <SmartFolderDefaultIcon className={menuIconClass} />
              {t('actions.create_smart_folder')}
            </ContextMenuItem>
          </DisabledMenuTooltip>
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
            {rootNode.children.length > 0 ? (
              rootNode.children.map(childId => (
                <ResourceNode
                  nodeId={childId}
                  key={childId}
                  hasTeamspace={hasTeamspace}
                  currentNamespace={currentNamespace}
                  onBatchDelete={onBatchDelete}
                  onBatchMove={onBatchMove}
                  onBatchCreate={onBatchCreate}
                  onAddToChat={onAddToChat}
                />
              ))
            ) : (
              <SidebarMenuItem>
                <div className="my-px flex h-8 cursor-not-allowed items-center pl-7 pr-2 text-sm text-muted-foreground">
                  {t('notification_modal.empty')}
                </div>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarGroupContent>
      )}
    </SidebarGroup>
  );
}
