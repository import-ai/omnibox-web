import { useEffect, useRef, useState } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { NativeTypes } from 'react-dnd-html5-backend';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

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
import { ALLOW_FILE_EXTENSIONS } from '@/const';
import useApp from '@/hooks/use-app';
import { useIsMobile } from '@/hooks/use-mobile';
import { http } from '@/lib/request';
import { cn } from '@/lib/utils';
import { useNode } from '@/page/sidebar/store/selectors';
import { useSidebarStore } from '@/page/sidebar/store/sidebar-store';

import Action from './node-actions';
import ContextMenuMain from './node-context-menu';

const FOCUS_DELAY = 50;
const BLUR_ENABLE_DELAY = 200;
const CLICK_DEBOUNCE_DELAY = 50;

const isValidFileType = (fileName: string): boolean => {
  const allowedExtensions = ALLOW_FILE_EXTENSIONS.split(',').map(ext =>
    ext.trim()
  );
  const fileExtension = '.' + fileName.split('.').pop()?.toLowerCase();
  return allowedExtensions.includes(fileExtension);
};

interface ResourceNodeProps {
  nodeId: string;
}

export default function ResourceNode({ nodeId }: ResourceNodeProps) {
  const app = useApp();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const params = useParams();
  const isMobile = useIsMobile();
  const { setOpenMobile } = useSidebar();
  const namespaceId = params.namespace_id || '';

  const node = useNode(nodeId);
  const activeId = useSidebarStore(s => s.activeId);
  const editingId = useSidebarStore(s => s.editingId);

  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const clickTimeoutRef = useRef<number | null>(null);
  const isBlurEnabledRef = useRef(false);
  const isEditingRef = useRef(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');

  if (!node) return null;

  const isActive = nodeId === activeId;
  // Local file drag target state (not from store)
  const [localFileDragTarget, setLocalFileDragTarget] = useState<string | null>(
    null
  );
  const isFileDragOverLocal = localFileDragTarget === nodeId;

  // Drag
  const [dragStyle, drag] = useDrag(
    {
      type: 'card',
      item: () => node,
      canDrag: () => !isEditing,
      collect: monitor => ({
        opacity: monitor.isDragging() ? 0.5 : 1,
      }),
    },
    [isEditing]
  );

  // Drop
  const [{ isOver: isOverHere }, drop] = useDrop({
    accept: ['card', NativeTypes.FILE],
    collect: monitor => ({
      isOver: monitor.isOver({ shallow: true }),
    }),
    hover: (item, monitor) => {
      if (!ref.current) return;
      const itemType = monitor.getItemType();
      const isOverShallow = monitor.isOver({ shallow: true });

      if (itemType === NativeTypes.FILE) {
        if (isOverShallow) setLocalFileDragTarget(nodeId);
      } else {
        setLocalFileDragTarget(null);
        if (!isOverShallow) return;
        const dragId = (item as { id: string }).id;
        if (dragId === nodeId) return;
        // Don't set target here; we'll handle in parent or via store
      }
    },
    drop: (item, monitor) => {
      const itemType = monitor.getItemType();
      if (itemType === NativeTypes.FILE) {
        if (monitor.didDrop()) return;
        const fileItem = item as { files: File[] };
        const validFiles = fileItem.files.filter(file =>
          isValidFileType(file.name)
        );
        if (validFiles.length > 0) {
          const fileList = new DataTransfer();
          validFiles.forEach(file => fileList.items.add(file));
          useSidebarStore
            .getState()
            .upload(nodeId, fileList.files)
            .then(id => {
              useSidebarStore.getState().activate(id);
              navigate(`/${namespaceId}/${id}`, {
                state: { fromSidebar: true },
              });
              if (isMobile) setOpenMobile(false);
              toast.success(
                t('upload.success', { count: fileList.files.length })
              );
            });
        } else {
          toast(t('upload.invalid_ext'), { position: 'bottom-right' });
        }
        setLocalFileDragTarget(null);
      } else {
        const dragItem = item as { id: string };
        if (dragItem.id !== nodeId) {
          http
            .post(
              `/namespaces/${namespaceId}/resources/${dragItem.id}/move/${nodeId}`
            )
            .then(() => {
              useSidebarStore.getState().move(dragItem.id, nodeId);
            })
            .catch(() => {
              toast.error(t('move.failed'));
            });
        }
      }
    },
  });

  useEffect(() => {
    if (!isOverHere && isFileDragOverLocal) {
      setLocalFileDragTarget(null);
    }
  }, [isOverHere, isFileDragOverLocal]);

  // Sync editing state from store
  useEffect(() => {
    if (editingId === nodeId) {
      setEditName(node.name || '');
      setIsEditing(true);
    } else if (isEditing) {
      isBlurEnabledRef.current = false;
      setIsEditing(false);
      setEditName(node.name || '');
    }
  }, [editingId, nodeId, node.name]);

  useEffect(() => {
    drag(ref);
    drop(ref);
  }, [drag, drop]);

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
    if (node.expanded) {
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
        if (!node.expanded) {
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
    useSidebarStore.getState().setEditingId(nodeId);
  };

  const handleBlur = () => {
    if (!isBlurEnabledRef.current || !isEditing) return;
    handleSave();
  };

  const handleSave = async () => {
    isBlurEnabledRef.current = false;
    const trimmedName = editName.trim();
    setIsEditing(false);
    useSidebarStore.getState().setEditingId(null);
    if (trimmedName && trimmedName !== node.name) {
      try {
        await useSidebarStore.getState().rename(nodeId, trimmedName);
        app.fire('update_resource', {
          id: nodeId,
          name: trimmedName,
          content: node.content,
          tags: node.tags,
        } as unknown as import('@/interface').Resource);
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
      useSidebarStore.getState().setEditingId(null);
      setEditName(node.name || '');
    }
  };

  const isUploading = useSidebarStore(s => nodeId in s.uploading);
  const uploadProgress = useSidebarStore(s => s.uploadProgress[nodeId]);

  return (
    <SidebarMenuItem>
      <Collapsible
        open={node.expanded}
        className={cn('group/collapsible', {
          '[&[data-state=open]>span>div>div>button>svg:first-child]:rotate-90':
            node.expanded && !node.loading && node.hasChildren,
        })}
      >
        <CollapsibleTrigger asChild>
          <ContextMenuMain nodeId={nodeId} namespaceId={namespaceId}>
            <div className="group/sidebar-item my-[1px] rounded-[6px] hover:bg-sidebar-accent">
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <SidebarMenuButton
                    asChild
                    className="gap-1 py-1.5 h-auto data-[active=true]:font-normal group-has-[[data-sidebar=menu-action]]/menu-item:pr-1 group-hover/sidebar-item:!pr-[30px] data-[active=true]:bg-[#E2E2E6] dark:data-[active=true]:bg-[#363637] transition-none"
                    onClick={handleClick}
                    onDoubleClick={handleDoubleClick}
                    isActive={isActive || isEditing}
                  >
                    <div
                      ref={ref}
                      data-resource-id={nodeId}
                      style={dragStyle}
                      className={cn('flex list cursor-pointer', {
                        'pl-1': node.hasChildren,
                        'pl-[28px]': !node.hasChildren,
                        'bg-sidebar-accent text-sidebar-accent-foreground':
                          isFileDragOverLocal || isOverHere,
                      })}
                    >
                      {node.hasChildren &&
                        (node.loading ? (
                          <Button
                            size="icon"
                            variant="outline"
                            className="size-[20px] bg-transparent shadow-none border-none hover:bg-transparent"
                          >
                            <Spinner />
                          </Button>
                        ) : (
                          <Button
                            size="icon"
                            variant="outline"
                            className="size-[20px] bg-transparent shadow-none border-none text-neutral-400 hover:bg-transparent"
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
                        expand={node.expanded}
                        resource={{
                          id: node.id,
                          name: node.name,
                          resource_type: node.resourceType,
                          has_children: node.hasChildren,
                          content: node.content,
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
                          className="flex-1 min-w-0 bg-transparent outline-none text-sm caret-blue-500"
                        />
                      ) : (
                        <span className="truncate flex-1">
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
                isUploading={isUploading}
                uploadProgress={uploadProgress}
              />
            </div>
          </ContextMenuMain>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub className="pr-0 py-0 mr-0 gap-0">
            {node.expanded &&
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
