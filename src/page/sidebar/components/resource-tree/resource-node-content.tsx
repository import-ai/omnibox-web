import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import ResourceIcon from '@/assets/icons/resourceIcon';
import { Arrow } from '@/assets/icons/treeArrow';
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
import useApp from '@/hooks/use-app';
import { useIsMobile } from '@/hooks/use-mobile';
import { Resource } from '@/interface';
import { cn } from '@/lib/utils';
import { useResourceNodeDnd } from '@/page/sidebar/hooks/use-resource-node-dnd';
import type { TreeNode } from '@/page/sidebar/store';
import { useSidebarStore } from '@/page/sidebar/store';

import Action from './node-actions';
import ContextMenuMain from './node-context-menu';
import ResourceNode from './resource-node';

const FOCUS_DELAY = 50;
const BLUR_ENABLE_DELAY = 200;
const CLICK_DEBOUNCE_DELAY = 50;

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

  const inputRef = useRef<HTMLInputElement>(null);
  const clickTimeoutRef = useRef<number | null>(null);
  const isBlurEnabledRef = useRef(false);
  const isEditingRef = useRef(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');

  const isActive = nodeId === activeId;

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
    if (!isEditing) return;
    isBlurEnabledRef.current = false;
    const focusTimer = setTimeout(() => {
      if (inputRef.current && isEditingRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, FOCUS_DELAY);
    const blurTimer = setTimeout(() => {
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

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
    setEditName(node.name || '');
    setIsEditing(true);
  };

  const handleBlur = () => {
    if (!isBlurEnabledRef.current || !isEditing) return;
    handleSave();
  };

  const handleSave = async () => {
    isBlurEnabledRef.current = false;
    const trimmedName = editName.trim();
    setIsEditing(false);
    if (trimmedName && trimmedName !== node.name) {
      try {
        await useSidebarStore.getState().rename(nodeId, trimmedName);
        app.fire('update_resource', {
          id: nodeId,
          name: trimmedName,
          content: node.content,
          tags: node.tags,
        } as unknown as Resource);
      } catch {
        setEditName(node.name || '');
      }
    } else {
      setEditName(node.name || '');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      isBlurEnabledRef.current = false;
      setIsEditing(false);
      setEditName(node.name || '');
    }
  };

  const upload = useSidebarStore(s => s.upload[nodeId]);

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
              setEditName(node.name || '');
              setIsEditing(true);
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
                      <ResourceIcon
                        expand={nodeUI?.expanded}
                        resource={{
                          id: node.id,
                          name: node.name,
                          parent_id: node.parentId,
                          resource_type: node.resourceType,
                          has_children: node.hasChildren,
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
                  setEditName(node.name || '');
                  setIsEditing(true);
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
