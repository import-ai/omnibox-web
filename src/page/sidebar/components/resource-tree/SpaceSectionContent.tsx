import {
  ChevronRight,
  FilePlus,
  FileUp,
  FolderPlus,
  Link,
  MoreHorizontal,
} from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { RssFolderDefaultIcon } from '@/assets/icons/RssFolderDefaultIcon';
import { SmartFolderDefaultIcon } from '@/assets/icons/SmartFolderDefaultIcon';
import { BehaviorExposure } from '@/components/BehaviorExposure';
import { ContextMenuContent } from '@/components/ContextMenuContent';
import { sidebarToolbarIconButtonClassName } from '@/components/omnibox/IconButton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/tooltip';
import {
  ContextMenu,
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
import { onOverlayClose, trackButtonClick } from '@/lib/trackButtonClick';
import { cn } from '@/lib/utils';
import { newFileEditorLocationState } from '@/page/resource/editor/focusNewFileTitle';
import { navigateToResource } from '@/page/resource/resourceNavigation';
import type { SmartFolderOwnerScope } from '@/page/sidebar/components/smart-folder';
import { useSpaceDrop } from '@/page/sidebar/hooks/useSpaceDrop';
import {
  getRssFolderQuotaTooltipKey,
  type RssFolderQuotaExhausted,
} from '@/page/sidebar/rssFolderQuota';
import type { TreeNode } from '@/page/sidebar/store';
import { useSidebarStore } from '@/page/sidebar/store';
import { isManagedChildrenNode } from '@/page/sidebar/store/utils';
import {
  locateSidebarResource,
  triggerGlobalFileUpload,
} from '@/page/sidebar/utils';
import { flattenExpandedResources } from '@/page/sidebar/virtualResourceTree';
import type { ResourceSortOptions } from '@/service/resource';

import { DisabledMenuTooltip } from './DisabledMenuTooltip';
import { useMenuTriggerPress } from './menuTriggerPress';
import ResourceNode from './ResourceNode';
import { ResourceSortMenu } from './ResourceSortMenu';
import { menuIconClass, menuItemClass } from './shared';
import {
  VirtualEmptyFolderRow,
  VirtualResourceRows,
} from './VirtualResourceRows';

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
  onCreateRssFolder: (spaceType: SpaceType) => void;
  smartFolderQuotaExhausted: Partial<Record<SmartFolderOwnerScope, boolean>>;
  rssFolderQuotaExhausted: RssFolderQuotaExhausted;
  resourceSort: ResourceSortOptions;
  sorting: boolean;
  onResourceSortChange: (sort: ResourceSortOptions) => void;
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
  onCreateRssFolder,
  smartFolderQuotaExhausted,
  rssFolderQuotaExhausted,
  resourceSort,
  sorting,
  onResourceSortChange,
}: SpaceSectionContentProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isTouch = useIsTouch();
  const menuTriggerPress = useMenuTriggerPress();

  const upload = useSidebarStore(s => s.dialogs.upload[rootId]);
  const nodes = useSidebarStore(s => s.nodes);
  const nodeUI = useSidebarStore(s => s.ui);
  const activeId = useSidebarStore(s => s.activeId);
  const rows = useMemo(
    () =>
      flattenExpandedResources(
        rootNode.children,
        nodes,
        id => nodeUI[id]?.expanded === true,
        id => {
          const node = nodes[id];
          const ui = nodeUI[id];
          return (
            !!node && !!ui?.loaded && !ui.loading && isManagedChildrenNode(node)
          );
        }
      ),
    [nodeUI, nodes, rootNode.children]
  );

  const entryTrackProps = { space_type: spaceType, entry: 'space_menu' };
  const handleCreateFolder = () => {
    trackButtonClick('sidebar_folder_create', entryTrackProps);
    useSidebarStore.getState().openCreateFolderDialog(rootId);
  };

  const handleCreateLink = () => {
    trackButtonClick('sidebar_link_open', entryTrackProps);
    useSidebarStore.getState().openCreateLinkDialog(rootId);
  };

  const smartFolderDisabled = smartFolderQuotaExhausted[spaceType] === true;
  const smartFolderDisabledTip = smartFolderDisabled
    ? t(
        spaceType === 'teamspace'
          ? 'smart_folder.create.team_quota_exhausted'
          : 'smart_folder.create.personal_quota_exhausted'
      )
    : undefined;

  const rssFolderDisabled = rssFolderQuotaExhausted[spaceType] === true;
  const rssFolderTooltipKey = getRssFolderQuotaTooltipKey(
    hasTeamspace,
    rssFolderQuotaExhausted,
    spaceType
  );
  const rssFolderDisabledTip = rssFolderTooltipKey
    ? t(rssFolderTooltipKey)
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
    trackButtonClick('sidebar_section_toggle');
    useSidebarStore.getState().toggleSpace(spaceType);
  };

  const handleUploadClick = () => {
    trackButtonClick('sidebar_file_upload', entryTrackProps);
    triggerGlobalFileUpload(rootId);
  };

  const handleCreateFile = () => {
    trackButtonClick('sidebar_file_create', entryTrackProps);
    useSidebarStore
      .getState()
      .create(rootId, 'doc')
      .then(async id => {
        navigateToResource(navigate, `/${namespaceId}/${id}/edit`, {
          state: newFileEditorLocationState(),
        });
        await locateSidebarResource(id);
      })
      .catch(() => {
        // request.ts handles backend error toasts.
      });
  };

  const handleCreateSmartFolder = () => {
    if (smartFolderDisabled) return;
    trackButtonClick('sidebar_smart_folder_create', entryTrackProps);
    onCreateSmartFolder(spaceType);
  };

  const handleCreateRssFolder = () => {
    if (rssFolderDisabled) return;
    trackButtonClick('sidebar_feed_create', entryTrackProps);
    onCreateRssFolder(spaceType);
  };

  return (
    <SidebarGroup
      ref={dropRef}
      className={cn('md:pr-0', {
        'bg-sidebar-border text-sidebar-accent-foreground':
          isFileDragOver || (canDrop && isOver),
      })}
    >
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <SidebarMenuButton className="group/sidebar-header h-(--sidebar-row-height) py-0">
            <div className="relative size-full">
              <SidebarGroupLabel
                onClick={handleHeaderToggle}
                className="mr-4 flex h-full cursor-pointer items-center gap-1 font-normal leading-none text-muted-foreground"
              >
                {spaceType ? t(spaceType) : ''}
                <ChevronRight
                  className={cn(
                    'size-3! shrink-0 text-muted-foreground transition-transform',
                    isOpen && 'rotate-90'
                  )}
                />
              </SidebarGroupLabel>
              <DropdownMenu>
                <DropdownMenuTrigger asChild {...menuTriggerPress.triggerProps}>
                  {upload !== undefined ? (
                    <SidebarMenuAction
                      asChild
                      className="pointer-events-none right-0 top-1/2 -translate-y-1/2 size-4 text-muted-foreground focus-visible:outline-hidden focus-visible:ring-transparent group-hover/sidebar-header:pointer-events-auto"
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
                        sidebarToolbarIconButtonClassName,
                        'right-0 top-1/2 size-4 -translate-y-1/2 cursor-pointer focus-visible:outline-hidden focus-visible:ring-transparent active:translate-y-[calc(-50%+1px)] select-none',
                        isTouch
                          ? 'pointer-events-auto opacity-100'
                          : 'pointer-events-none opacity-0 group-hover/sidebar-header:pointer-events-auto group-hover/sidebar-header:opacity-100'
                      )}
                    >
                      <button
                        onClick={() => trackButtonClick('sidebar_section_open')}
                        type="button"
                      >
                        <MoreHorizontal />
                      </button>
                    </SidebarMenuAction>
                  )}
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  onPointerDownOutside={onOverlayClose(
                    'sidebar_overlay_close',
                    'space_menu'
                  )}
                  side="right"
                  sideOffset={10}
                  align="start"
                  className="w-auto! min-w-36"
                  {...menuTriggerPress.contentProps}
                >
                  <BehaviorExposure
                    target="resource_creation_entry"
                    props={{
                      entry: 'create_file',
                      space_type: spaceType,
                      location: 'root_menu',
                    }}
                  >
                    <DropdownMenuItem
                      className={menuItemClass}
                      onClick={handleCreateFile}
                    >
                      <FilePlus className={menuIconClass} />
                      {t('actions.create_file')}
                    </DropdownMenuItem>
                  </BehaviorExposure>
                  <BehaviorExposure
                    target="resource_creation_entry"
                    props={{
                      entry: 'create_folder',
                      space_type: spaceType,
                      location: 'root_menu',
                    }}
                  >
                    <DropdownMenuItem
                      className={menuItemClass}
                      onClick={handleCreateFolder}
                    >
                      <FolderPlus className={menuIconClass} />
                      {t('actions.create_folder')}
                    </DropdownMenuItem>
                  </BehaviorExposure>
                  <DisabledMenuTooltip content={rssFolderDisabledTip}>
                    <BehaviorExposure
                      target="resource_creation_entry"
                      props={{
                        entry: 'create_rss_folder',
                        space_type: spaceType,
                        location: 'root_menu',
                      }}
                    >
                      <DropdownMenuItem
                        className={cn(
                          menuItemClass,
                          rssFolderDisabled &&
                            'cursor-not-allowed text-muted-foreground opacity-50'
                        )}
                        onClick={
                          rssFolderDisabled ? undefined : handleCreateRssFolder
                        }
                        onSelect={event => {
                          if (rssFolderDisabled) {
                            event.preventDefault();
                          }
                        }}
                        aria-disabled={rssFolderDisabled}
                      >
                        <RssFolderDefaultIcon className={menuIconClass} />
                        {t('actions.create_rss_folder')}
                      </DropdownMenuItem>
                    </BehaviorExposure>
                  </DisabledMenuTooltip>
                  <DisabledMenuTooltip content={smartFolderDisabledTip}>
                    <BehaviorExposure
                      target="resource_creation_entry"
                      props={{
                        entry: 'create_smart_folder',
                        space_type: spaceType,
                        location: 'root_menu',
                      }}
                    >
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
                    </BehaviorExposure>
                  </DisabledMenuTooltip>
                  <BehaviorExposure
                    target="resource_creation_entry"
                    props={{
                      entry: 'upload_file',
                      space_type: spaceType,
                      location: 'root_menu',
                    }}
                  >
                    <DropdownMenuItem
                      className={menuItemClass}
                      onClick={handleUploadClick}
                    >
                      <FileUp className={menuIconClass} />
                      {t('actions.upload_file')}
                    </DropdownMenuItem>
                  </BehaviorExposure>
                  <BehaviorExposure
                    target="resource_creation_entry"
                    props={{
                      entry: 'add_link',
                      space_type: spaceType,
                      location: 'root_menu',
                    }}
                  >
                    <DropdownMenuItem
                      className={menuItemClass}
                      onClick={handleCreateLink}
                    >
                      <Link className={menuIconClass} />
                      {t('actions.add_link')}
                    </DropdownMenuItem>
                  </BehaviorExposure>
                  <ResourceSortMenu
                    value={resourceSort}
                    disabled={sorting}
                    onChange={onResourceSortChange}
                  />
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </SidebarMenuButton>
        </ContextMenuTrigger>
        <ContextMenuContent
          onPointerDownOutside={onOverlayClose(
            'sidebar_overlay_close',
            'space_menu'
          )}
        >
          <BehaviorExposure
            target="resource_creation_entry"
            props={{
              entry: 'create_file',
              space_type: spaceType,
              location: 'root_menu',
            }}
          >
            <ContextMenuItem
              className={menuItemClass}
              onClick={handleCreateFile}
            >
              <FilePlus className={menuIconClass} />
              {t('actions.create_file')}
            </ContextMenuItem>
          </BehaviorExposure>
          <BehaviorExposure
            target="resource_creation_entry"
            props={{
              entry: 'create_folder',
              space_type: spaceType,
              location: 'root_menu',
            }}
          >
            <ContextMenuItem
              className={menuItemClass}
              onClick={handleCreateFolder}
            >
              <FolderPlus className={menuIconClass} />
              {t('actions.create_folder')}
            </ContextMenuItem>
          </BehaviorExposure>
          <DisabledMenuTooltip content={rssFolderDisabledTip}>
            <BehaviorExposure
              target="resource_creation_entry"
              props={{
                entry: 'create_rss_folder',
                space_type: spaceType,
                location: 'root_menu',
              }}
            >
              <ContextMenuItem
                className={cn(
                  menuItemClass,
                  rssFolderDisabled &&
                    'cursor-not-allowed text-muted-foreground opacity-50'
                )}
                onClick={rssFolderDisabled ? undefined : handleCreateRssFolder}
                onSelect={event => {
                  if (rssFolderDisabled) {
                    event.preventDefault();
                  }
                }}
                aria-disabled={rssFolderDisabled}
              >
                <RssFolderDefaultIcon className={menuIconClass} />
                {t('actions.create_rss_folder')}
              </ContextMenuItem>
            </BehaviorExposure>
          </DisabledMenuTooltip>
          <DisabledMenuTooltip content={smartFolderDisabledTip}>
            <BehaviorExposure
              target="resource_creation_entry"
              props={{
                entry: 'create_smart_folder',
                space_type: spaceType,
                location: 'root_menu',
              }}
            >
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
            </BehaviorExposure>
          </DisabledMenuTooltip>
          <BehaviorExposure
            target="resource_creation_entry"
            props={{
              entry: 'upload_file',
              space_type: spaceType,
              location: 'root_menu',
            }}
          >
            <ContextMenuItem
              className={menuItemClass}
              onClick={handleUploadClick}
            >
              <FileUp className={menuIconClass} />
              {t('actions.upload_file')}
            </ContextMenuItem>
          </BehaviorExposure>
          <BehaviorExposure
            target="resource_creation_entry"
            props={{
              entry: 'add_link',
              space_type: spaceType,
              location: 'root_menu',
            }}
          >
            <ContextMenuItem
              className={menuItemClass}
              onClick={handleCreateLink}
            >
              <Link className={menuIconClass} />
              {t('actions.add_link')}
            </ContextMenuItem>
          </BehaviorExposure>
          <ResourceSortMenu
            variant="context"
            value={resourceSort}
            disabled={sorting}
            onChange={onResourceSortChange}
          />
        </ContextMenuContent>
      </ContextMenu>
      {isOpen && (
        <SidebarGroupContent>
          <SidebarMenu className="gap-0.5">
            {rootNode.children.length > 0 ? (
              <VirtualResourceRows
                listId={rootId}
                publishSpans
                revealId={activeId}
                rows={rows}
                renderEmpty={({ depth, parentId }) => (
                  <VirtualEmptyFolderRow depth={depth} parentId={parentId} />
                )}
                renderNode={({ depth, id }) => (
                  <ResourceNode
                    nodeId={id}
                    depth={depth}
                    renderChildren={false}
                    hasTeamspace={hasTeamspace}
                    currentNamespace={currentNamespace}
                    onBatchDelete={onBatchDelete}
                    onBatchMove={onBatchMove}
                    onBatchCreate={onBatchCreate}
                    onAddToChat={onAddToChat}
                  />
                )}
              />
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
