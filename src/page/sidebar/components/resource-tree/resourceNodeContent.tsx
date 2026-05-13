import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { Arrow } from '@/assets/icons/treeArrow';
import ResourceTypeIcon from '@/components/resourceTypeIcon';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  useSidebar,
} from '@/components/ui/sidebar';
import { Spinner } from '@/components/ui/spinner';
import useApp from '@/hooks/useApp';
import { useIsMobile } from '@/hooks/useMobile';
import { Resource } from '@/interface';
import { cn } from '@/lib/utils';
import { useResourceNodeDnd } from '@/page/sidebar/hooks/useResourceNodeDnd';
import type { TreeNode } from '@/page/sidebar/store';
import { useSidebarStore } from '@/page/sidebar/store';

import Action from './nodeActions';
import ContextMenuMain from './nodeContextMenu';
import ResourceNode from './resourceNode';

const FOCUS_DELAY = 50;
const BLUR_ENABLE_DELAY = 200;
const CLICK_DEBOUNCE_DELAY = 250;

interface ResourceNodeContentProps {
  node: TreeNode;
  nodeId: string;
}

export function ResourceNodeContent({
  node,
  nodeId,
}: ResourceNodeContentProps) {
  const app = useApp();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const params = useParams();
  const isMobile = useIsMobile();
  const { setOpenMobile } = useSidebar();
  const namespaceId = params.namespace_id || '';

  const nodeUI = useSidebarStore(s => s.ui[nodeId]);
  const activeId = useSidebarStore(s => s.activeId);
  const renamingId = useSidebarStore(s => s.renamingId);

  const inputRef = useRef<HTMLInputElement>(null);
  const clickTimeoutRef = useRef<number | null>(null);
  const isBlurEnabledRef = useRef(false);
  const isEditingRef = useRef(false);

  const [editName, setEditName] = useState('');

  const isActive = nodeId === activeId;
  const isEditing = nodeId === renamingId;

  const { ref, dragStyle, isOver, isFileDragOver } = useResourceNodeDnd(
    nodeId,
    node,
    isEditing,
    { namespaceId }
  );

  useEffect(() => {
    isEditingRef.current = isEditing;
  }, [isEditing]);

  useEffect(() => {
    setEditName(node.name || '');
  }, [node.name]);

  const handleNavigate = (id: string, edit?: boolean) => {
    if (edit) {
      navigate(`/${namespaceId}/${id}/edit`, { state: { fromSidebar: true } });
    } else if (id === 'chat') {
      navigate(`/${namespaceId}/chat`);
    } else {
      navigate(`/${namespaceId}/${id}`, { state: { fromSidebar: true } });
    }
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handleExpand = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (nodeUI?.expanded) {
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
        handleNavigate(nodeId);
        useSidebarStore.getState().activate(nodeId);
        if (!nodeUI?.expanded) {
          useSidebarStore.getState().expand(nodeId);
        }
      }
    } else {
      handleNavigate(nodeId);
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
    if (trimmedName && trimmedName !== node.name) {
      try {
        await useSidebarStore.getState().rename(nodeId, trimmedName);
        app.fire('update_resource', {
          id: nodeId,
          name: trimmedName,
        } as unknown as Resource);
      } catch {
        setEditName(node.name || '');
      }
    } else {
      setEditName(node.name || '');
    }
  }, [app, editName, node.name, nodeId]);

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
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
    startRename();
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
        open={nodeUI?.expanded}
        className={cn('group/collapsible', {
          '[&[data-state=open]>span>div>div>button>svg:first-child]:rotate-90':
            nodeUI?.expanded && !nodeUI?.loading && node.hasChildren,
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
            <div className="group/sidebar-item my-px rounded-md hover:bg-sidebar-accent">
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <SidebarMenuButton
                    asChild
                    className="h-auto gap-1 py-1.5 transition-none group-hover/sidebar-item:!pr-[30px] group-has-[[data-sidebar=menu-action]]/menu-item:pr-1 data-[active=true]:bg-[#E2E2E6] data-[active=true]:font-normal dark:data-[active=true]:bg-[#363637]"
                    onClick={handleClick}
                    onDoubleClick={handleDoubleClick}
                    isActive={isActive || isEditing}
                  >
                    <div
                      ref={ref}
                      data-resource-id={nodeId}
                      style={dragStyle}
                      className={cn('list flex cursor-pointer', {
                        'pl-1': node.hasChildren,
                        'pl-7': !node.hasChildren,
                        'bg-sidebar-accent text-sidebar-accent-foreground':
                          isFileDragOver || isOver,
                      })}
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
                        expand={nodeUI?.expanded}
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
              <Action
                nodeId={nodeId}
                namespaceId={namespaceId}
                upload={upload}
                onRename={() => {
                  startRename();
                }}
              />
            </div>
          </ContextMenuMain>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub className="mr-0 gap-0 py-0 pr-0">
            {nodeUI?.expanded &&
              node.hasChildren &&
              node.children.length > 0 &&
              node.children.map(childId => (
                <ResourceNode nodeId={childId} key={childId} />
              ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  );
}
