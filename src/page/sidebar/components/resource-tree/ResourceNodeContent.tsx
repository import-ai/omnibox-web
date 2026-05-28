import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import useApp from '@/hooks/useApp';
import { useIsMobile } from '@/hooks/useMobile';
import { Namespace, Resource } from '@/interface';
import { cn } from '@/lib/utils';
import { getSmartFolderSourceResourceId } from '@/page/sidebar/components/smart-folder';
import { useResourceNodeDnd } from '@/page/sidebar/hooks/useResourceNodeDnd';
import type { TreeNode } from '@/page/sidebar/store';
import {
  useIsSelected,
  useNodeIsDimmedBySelection,
  useNodeIsFullySelected,
  useNodeIsIndeterminate,
  useSelectionState,
  useSidebarStore,
} from '@/page/sidebar/store';

import Action from './NodeActions';
import ContextMenuMain from './NodeContextMenu';
import ResourceNode from './ResourceNode';

const FOCUS_DELAY = 50;
const BLUR_ENABLE_DELAY = 200;
const CLICK_DEBOUNCE_DELAY = 250;

interface ResourceNodeContentProps {
  node: TreeNode;
  nodeId: string;
  depth: number;
  hasTeamspace: boolean;
  currentNamespace?: Namespace;
}

export function ResourceNodeContent({
  node,
  nodeId,
  depth,
  hasTeamspace,
  currentNamespace,
}: ResourceNodeContentProps) {
  const app = useApp();
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
  const isIndeterminate = useNodeIsIndeterminate(nodeId);
  const isDimmedBySelection = useNodeIsDimmedBySelection(nodeId);

  const inputRef = useRef<HTMLInputElement>(null);
  const clickTimeoutRef = useRef<number | null>(null);
  const isBlurEnabledRef = useRef(false);
  const isEditingRef = useRef(false);

  const [editName, setEditName] = useState('');

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
  const contentIndent = depth * 20;
  const nodeIndent = node.hasChildren ? 4 : 28;

  const {
    dragRef,
    dropRef,
    dragStyle,
    isOver,
    isDisabledOver,
    isFileDragOver,
  } = useResourceNodeDnd(nodeId, node, isEditing, {
    namespaceId,
    selectionMode,
    isSelected,
    selectedIds: selectedIdList,
  });

  useEffect(() => {
    isEditingRef.current = isEditing;
  }, [isEditing]);

  useEffect(() => {
    setEditName(node.name || '');
  }, [node.name]);

  const handleNavigate = (id: string, edit?: boolean) => {
    const state = {
      fromSidebar: true,
      ...(sourceResourceId ? { sidebarActiveKey: nodeId } : {}),
    };

    if (edit) {
      navigate(`/${namespaceId}/${id}/edit`, { state });
    } else if (id === 'chat') {
      navigate(`/${namespaceId}/chat`);
    } else {
      navigate(`/${namespaceId}/${id}`, { state });
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
    if (node.hasChildren) {
      if (isActive) {
        handleExpand();
      } else {
        handleNavigate(sourceResourceId || nodeId);
        useSidebarStore.getState().activate(nodeId);
        if (!isExpanded) {
          useSidebarStore.getState().expand(nodeId);
        }
      }
    } else {
      handleNavigate(sourceResourceId || nodeId);
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

  const startRename = useCallback(() => {
    useSidebarStore.getState().setRenamingId(nodeId);
  }, [nodeId]);

  const handleSave = useCallback(async () => {
    if (!isEditingRef.current) return;
    isBlurEnabledRef.current = false;
    isEditingRef.current = false;
    const trimmedName = editName.trim();
    useSidebarStore.getState().setRenamingId(null);
    const renameId = sourceResourceId || nodeId;
    if (trimmedName && trimmedName !== node.name) {
      try {
        await useSidebarStore.getState().rename(renameId, trimmedName);
        if (sourceResourceId) {
          useSidebarStore.getState().patch(nodeId, { name: trimmedName });
          app.fire('refresh_smart_folder_children', node.parentId);
        }
        app.fire('update_resource', {
          id: renameId,
          name: trimmedName,
        } as unknown as Resource);
      } catch {
        setEditName(node.name || '');
      }
    } else {
      setEditName(node.name || '');
    }
  }, [app, editName, node.name, node.parentId, nodeId, sourceResourceId]);

  useEffect(() => {
    if (!isEditing) return;

    isBlurEnabledRef.current = false;

    const focusTimer = window.setTimeout(() => {
      if (inputRef.current && isEditingRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, FOCUS_DELAY);

    const blurTimer = window.setTimeout(() => {
      if (isEditingRef.current) {
        isBlurEnabledRef.current = true;
      }
    }, BLUR_ENABLE_DELAY);

    return () => {
      clearTimeout(focusTimer);
      clearTimeout(blurTimer);
      isBlurEnabledRef.current = false;
    };
  }, [isEditing]);

  useEffect(() => {
    if (renamingId === nodeId) {
      setEditName(node.name || '');
      return;
    }

    isBlurEnabledRef.current = false;
    isEditingRef.current = false;
    setEditName(node.name || '');
  }, [node.name, nodeId, renamingId]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (selectionMode) return;
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

  const handleBlur = () => {
    if (!isEditing || !isBlurEnabledRef.current) return;
    handleSave();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      isBlurEnabledRef.current = false;
      isEditingRef.current = false;
      useSidebarStore.getState().setRenamingId(null);
      setEditName(node.name || '');
    }
  };

  const upload = useSidebarStore(s => s.dialogs.upload[nodeId]);

  return (
    <SidebarMenuItem>
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
          >
            <div
              ref={dropRef}
              data-resource-id={nodeId}
              style={selectionMode ? { marginLeft: -1 * depth } : undefined}
              className={cn(
                'group/sidebar-item my-px rounded-md hover:bg-sidebar-accent',
                'flex items-center',
                (isActive || isEditing) &&
                  'hover:bg-[#E2E2E6] bg-[#E2E2E6] dark:bg-[#363637]',
                selectionMode && 'pl-2',
                isSelectionHighlighted &&
                  'bg-[#E2E2E6] dark:bg-[#363637] hover:bg-[#E2E2E6]',
                (isFileDragOver || isOver) &&
                  'bg-sidebar-accent text-sidebar-accent-foreground',
                isDisabledOver && 'cursor-not-allowed [&_*]:cursor-not-allowed'
              )}
            >
              {selectionMode && (
                <Checkbox
                  onClick={handleSelectionChange}
                  muted={isDimmedBySelection}
                  aria-label={t('batch.multi_select')}
                  checked={isIndeterminate ? 'indeterminate' : isFullySelected}
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
                        'list flex cursor-pointer',
                        isDisabledOver && 'cursor-not-allowed'
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
          <SidebarMenuSub className="m-0 gap-0 border-0 p-0">
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
                />
              ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  );
}
