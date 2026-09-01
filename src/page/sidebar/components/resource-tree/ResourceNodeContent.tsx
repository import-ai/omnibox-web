import { useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { Arrow } from '@/assets/icons/Arrow';
import { Checkbox } from '@/components/Checkbox';
import ResourceTypeIcon from '@/components/ResourceTypeIcon';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { Button } from '@/components/ui/Button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/Collapsible';
import {
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  useSidebar,
} from '@/components/ui/Sidebar';
import { Spinner } from '@/components/ui/Spinner';
import { useIsMobile } from '@/hooks/useMobile';
import { cn } from '@/lib/utils';
import { navigateToResource } from '@/page/resource/resourceNavigation';
import { RssItemFeedBadge } from '@/page/sidebar/components/rss-folder/RssItemFeedBadge';
import { useRssItemFeedName } from '@/page/sidebar/components/rss-folder/useRssFolderLinkNames';
import { getSmartFolderSourceResourceId } from '@/page/sidebar/components/smart-folder';
import { useResourceNodeDnd } from '@/page/sidebar/hooks/useResourceNodeDnd';
import { useResourceNodeRename } from '@/page/sidebar/hooks/useResourceNodeRename';
import {
  RESOURCE_TREE_ICON_OFFSET,
  RESOURCE_TREE_INDENT,
} from '@/page/sidebar/manualDropIndicator';
import {
  useIsSelected,
  useNodeIsDimmedBySelection,
  useNodeIsFullySelected,
  useSelectionState,
  useSidebarStore,
} from '@/page/sidebar/store';
import {
  isBatchSelectableNode,
  isManagedChildrenNode,
} from '@/page/sidebar/store/utils';

import FolderEmptyState from './FolderEmptyState';
import Action from './NodeActions';
import ContextMenuMain from './NodeContextMenu';
import ResourceNode from './ResourceNode';
import type { ResourceNodeContentProps } from './resourceNodeTypes';

const CLICK_DEBOUNCE_DELAY = 250;

export function ResourceNodeContent({
  node,
  nodeId,
  depth,
  hasTeamspace,
  currentNamespace,
  onBatchDelete,
  onBatchMove,
  onBatchCreate,
  onAddToChat,
}: ResourceNodeContentProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const isMobile = useIsMobile();
  const { setOpenMobile } = useSidebar();
  const namespaceId = params.namespace_id || '';

  const nodeUI = useSidebarStore(s => s.ui[nodeId]);
  const activeId = useSidebarStore(s => s.activeId);
  const renamingId = useSidebarStore(s => s.renamingId);
  const { selectionMode, lastSelectedId, selectedIds } = useSelectionState();
  const isSelected = useIsSelected(nodeId);
  const isFullySelected = useNodeIsFullySelected(nodeId);
  const isDimmedBySelection = useNodeIsDimmedBySelection(nodeId);

  const clickTimeoutRef = useRef<number | null>(null);
  // The config endpoint only exists for an rss folder, and a row's parent is
  // not always the feed folder the item lives in: a smart folder collecting rss
  // items re-parents them to itself. Asking that folder for a feed config 404s,
  // and the miss is memoised, so every badge in the session goes missing.
  const parentResourceType = useSidebarStore(s =>
    node.parentId ? s.nodes[node.parentId]?.resourceType : undefined
  );
  const rssFolderId =
    parentResourceType === 'rss_folder' ? node.parentId : null;

  // Only resolves for an rss item, and only to a named feed of its folder.
  const feedName = useRssItemFeedName(namespaceId, {
    resourceType: node.resourceType,
    folderId: rssFolderId,
    attrs: node.attrs,
  });

  const smartFolderSourceResourceId = getSmartFolderSourceResourceId({
    id: node.id,
    parent_id: node.parentId || '',
    attrs: node.attrs,
  });
  const sourceResourceId =
    smartFolderSourceResourceId !== node.id
      ? smartFolderSourceResourceId
      : undefined;
  const activeSidebarKey =
    typeof location.state?.sidebarActiveKey === 'string'
      ? location.state.sidebarActiveKey
      : activeId;
  const isActive = nodeId === activeSidebarKey;
  const isEditing = nodeId === renamingId;
  const isSelectionHighlighted = isSelected || isFullySelected;
  const isExpanded = nodeUI?.expanded === true;
  const selectedIdList = useMemo(() => Object.keys(selectedIds), [selectedIds]);
  const contentIndent = depth * RESOURCE_TREE_INDENT;
  const nodeIndent = node.hasChildren ? 4 : RESOURCE_TREE_ICON_OFFSET;
  const isSelectable = isBatchSelectableNode(node);
  const {
    editName,
    handleBlur,
    handleKeyDown,
    inputRef,
    setEditName,
    startRename,
  } = useResourceNodeRename({
    isEditing,
    node,
    nodeId,
    sourceResourceId,
  });

  const {
    dragRef,
    dropRef,
    dragStyle,
    isDisabledOver,
    isFileDragOver,
    isInsideDrop,
  } = useResourceNodeDnd(nodeId, node, isEditing, {
    namespaceId,
    depth,
    selectionMode,
    isSelected,
    selectedIds: selectedIdList,
  });

  const handleNavigate = (id: string, edit?: boolean) => {
    const state = {
      fromSidebar: true,
      ...(sourceResourceId ? { sidebarActiveKey: nodeId } : {}),
    };

    if (edit) {
      navigateToResource(navigate, `/${namespaceId}/${id}/edit`, { state });
    } else if (id === 'chat') {
      navigate(`/${namespaceId}/chat`);
    } else {
      navigateToResource(navigate, `/${namespaceId}/${id}`, { state });
    }
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handleExpand = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (isExpanded) {
      useSidebarStore.getState().collapse(nodeId);
    } else {
      useSidebarStore.getState().expand(nodeId);
    }
  };

  const handleActive = () => {
    const targetId = sourceResourceId || nodeId;
    if (node.hasChildren) {
      if (isActive) {
        // When the folder is active but we've navigated into one of its
        // sub-pages, a click should jump back to the folder's own detail page
        // rather than just toggling the tree.
        if (location.pathname === `/${namespaceId}/${targetId}`) {
          handleExpand();
        } else {
          handleNavigate(targetId);
          if (!isExpanded) {
            useSidebarStore.getState().expand(nodeId);
          }
        }
      } else {
        handleNavigate(targetId);
        useSidebarStore.getState().activate(nodeId);
        if (!isExpanded) {
          useSidebarStore.getState().expand(nodeId);
        }
      }
    } else {
      handleNavigate(targetId);
      useSidebarStore.getState().activate(nodeId);
    }
  };

  const handleClick = () => {
    if (isEditing) return;
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      return;
    }
    clickTimeoutRef.current = window.setTimeout(() => {
      clickTimeoutRef.current = null;
      handleActive();
    }, CLICK_DEBOUNCE_DELAY);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (selectionMode || node.readOnly) return;
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
    startRename();
  };

  const handleSelectionChange = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    useSidebarStore
      .getState()
      .toggleSelection(
        nodeId,
        event.shiftKey ? lastSelectedId || undefined : undefined
      );
  };

  const upload = useSidebarStore(s => s.dialogs.upload[nodeId]);

  return (
    <SidebarMenuItem data-resource-tree-id={nodeId} data-resource-depth={depth}>
      <Collapsible
        open={isExpanded}
        className={cn('group/collapsible', {
          '[&[data-state=open]>span>div>div>button>svg:first-child]:rotate-90':
            isExpanded && !nodeUI?.loading && node.hasChildren,
        })}
      >
        <CollapsibleTrigger asChild>
          <ContextMenuMain
            nodeId={nodeId}
            namespaceId={namespaceId}
            onRename={() => {
              startRename();
            }}
            batchActions={{
              onCreate: onBatchCreate,
              onMove: onBatchMove,
              onAddToChat,
              onDelete: onBatchDelete,
            }}
          >
            <div
              ref={dropRef}
              data-resource-id={nodeId}
              data-resource-drop-id={nodeId}
              className={cn(
                'group/sidebar-item relative my-px rounded-md hover:bg-sidebar-accent',
                'flex items-center',
                (isActive || isEditing) &&
                  'hover:bg-[#E2E2E6] bg-[#E2E2E6] dark:bg-[#363637]',
                selectionMode && 'pl-2',
                isSelectionHighlighted &&
                  'bg-[#E2E2E6] dark:bg-[#363637] hover:bg-[#E2E2E6]',
                isFileDragOver &&
                  'bg-sidebar-accent text-sidebar-accent-foreground',
                isInsideDrop &&
                  'bg-sidebar-accent text-sidebar-accent-foreground ring-2 ring-inset ring-blue-500',
                isDisabledOver && 'cursor-not-allowed [&_*]:cursor-not-allowed'
              )}
            >
              {selectionMode && isSelectable && (
                <Checkbox
                  onClick={handleSelectionChange}
                  muted={isDimmedBySelection}
                  aria-label={t('batch.multi_select')}
                  checked={isFullySelected}
                />
              )}
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <SidebarMenuButton
                    asChild
                    className={cn(
                      'h-auto gap-1 py-1.5 transition-none bg-transparent group-has-[[data-sidebar=menu-action]]/menu-item:pr-1 data-[active=true]:font-normal data-[active=true]:bg-transparent dark:data-[active=true]:bg-transparent hover:bg-transparent',
                      !selectionMode && 'group-hover/sidebar-item:!pr-[30px]',
                      isDisabledOver && 'cursor-not-allowed'
                    )}
                    onClick={handleClick}
                    onDoubleClick={handleDoubleClick}
                    isActive={isActive || isEditing}
                  >
                    <div
                      ref={dragRef}
                      data-resource-id={nodeId}
                      className={cn(
                        'list flex',
                        isDisabledOver ? 'cursor-not-allowed' : 'cursor-pointer'
                      )}
                      style={{
                        ...dragStyle,
                        paddingLeft: `${contentIndent + nodeIndent}px`,
                      }}
                    >
                      {node.hasChildren &&
                        (nodeUI?.loading ? (
                          <Button
                            size="icon"
                            variant="outline"
                            className="size-5 border-none bg-transparent shadow-none hover:bg-transparent"
                          >
                            <Spinner />
                          </Button>
                        ) : (
                          <Button
                            size="icon"
                            variant="outline"
                            className="size-5 border-none bg-transparent text-neutral-400 shadow-none hover:bg-transparent"
                            onClick={event => {
                              event.preventDefault();
                              event.stopPropagation();
                              handleExpand();
                            }}
                          >
                            <Arrow className="transition-transform" />
                          </Button>
                        ))}
                      <RssItemFeedBadge
                        name={feedName}
                        size="sidebar"
                        fallback={
                          <ResourceTypeIcon
                            expand={isExpanded}
                            resource={{
                              id: node.id,
                              name: node.name,
                              parentId: node.parentId,
                              resourceType: node.resourceType,
                              hasChildren: node.hasChildren,
                              attrs: node.attrs,
                            }}
                          />
                        }
                      />
                      {isEditing ? (
                        <input
                          ref={inputRef}
                          type="text"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          onBlur={handleBlur}
                          onKeyDown={handleKeyDown}
                          autoComplete="off"
                          onClick={e => e.stopPropagation()}
                          onDoubleClick={e => e.stopPropagation()}
                          className="min-w-0 flex-1 bg-transparent text-sm caret-blue-500 outline-none"
                        />
                      ) : (
                        <span className="flex-1 truncate">
                          {node.name || t('untitled')}
                        </span>
                      )}
                    </div>
                  </SidebarMenuButton>
                </TooltipTrigger>
                {!isEditing && (
                  <TooltipContent
                    side="right"
                    sideOffset={8}
                    className="max-w-xs break-all"
                  >
                    {node.name || t('untitled')}
                  </TooltipContent>
                )}
              </Tooltip>
              {!selectionMode && (
                <Action
                  nodeId={nodeId}
                  namespaceId={namespaceId}
                  upload={upload}
                  onRename={() => {
                    startRename();
                  }}
                />
              )}
            </div>
          </ContextMenuMain>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub className="m-0 translate-x-0 gap-0 border-0 p-0">
            {isExpanded &&
              node.hasChildren &&
              node.children.length > 0 &&
              node.children.map(childId => (
                <ResourceNode
                  nodeId={childId}
                  key={childId}
                  depth={depth + 1}
                  hasTeamspace={hasTeamspace}
                  currentNamespace={currentNamespace}
                  onBatchDelete={onBatchDelete}
                  onBatchMove={onBatchMove}
                  onBatchCreate={onBatchCreate}
                  onAddToChat={onAddToChat}
                />
              ))}
            {/* A folder the backend fills — a smart folder or a feed — reads as
                broken when it expands to nothing, so it says so. An empty
                plain folder is the user's own doing and stays silent. */}
            {isExpanded &&
              nodeUI?.loaded &&
              !nodeUI.loading &&
              isManagedChildrenNode(node) &&
              node.children.length === 0 && (
                <FolderEmptyState depth={depth + 1} />
              )}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  );
}
