import { LoaderCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { NativeTypes } from 'react-dnd-html5-backend';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

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
} from '@/components/ui/sidebar';
import { ALLOW_FILE_EXTENSIONS } from '@/const';
import useApp from '@/hooks/use-app';
import { IResourceData } from '@/interface';
import { cn } from '@/lib/utils';
import { ISidebarProps } from '@/page/sidebar/interface';

import Action from './action';
import { Arrow } from './arrow';
import ContextMenuMain from './contextMenu';
import ResourceIcon from './resourceIcon.tsx';

// Timing constants for rename functionality
const FOCUS_DELAY = 10;
const BLUR_ENABLE_DELAY = 200;
const CLICK_DEBOUNCE_DELAY = 200;

// Helper function to validate file extensions
const isValidFileType = (fileName: string): boolean => {
  const allowedExtensions = ALLOW_FILE_EXTENSIONS.split(',').map(ext =>
    ext.trim()
  );
  const fileExtension = '.' + fileName.split('.').pop()?.toLowerCase();
  return allowedExtensions.includes(fileExtension);
};

export interface ITreeProps extends ISidebarProps {
  onDrop: (item: IResourceData, target: IResourceData | null) => void;
  target: IResourceData | null;
  onTarget: (target: IResourceData | null) => void;
  fileDragTarget: string | null;
  onFileDragTarget: (target: string | null) => void;
}

export default function Tree(props: ITreeProps) {
  const {
    data,
    onDrop,
    target,
    onTarget,
    spaceType,
    activeKey,
    expands,
    expanding,
    onExpand,
    onActiveKey,
    onUpload,
    onRename,
    fileDragTarget,
    onFileDragTarget,
  } = props;
  const app = useApp();
  const ref = useRef(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const clickTimeoutRef = useRef<number | null>(null);
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(data.name || '');
  const isBlurEnabledRef = useRef(false);
  const isEditingRef = useRef(false);

  // Sync data.name changes to editName
  useEffect(() => {
    setEditName(data.name || '');
  }, [data.name]);

  const expand = expands.includes(data.id);
  const isFileDragOver = fileDragTarget === data.id;
  const [dragStyle, drag] = useDrag({
    type: 'card',
    item: data,
    canDrag: () => !isEditing,
    collect: monitor => ({
      opacity: monitor.isDragging() ? 0.5 : 1,
    }),
  });
  const [{ isOver: isOverHere }, drop] = useDrop({
    accept: ['card', NativeTypes.FILE],
    collect: monitor => ({
      isOver: monitor.isOver({ shallow: true }),
    }),
    hover: (item, monitor) => {
      if (!ref.current) {
        onTarget(null);
        return;
      }

      const itemType = monitor.getItemType();
      const isOverShallow = monitor.isOver({ shallow: true });

      if (itemType === NativeTypes.FILE) {
        // Only highlight on shallow hover
        if (isOverShallow) {
          onFileDragTarget(data.id);
        }
        // Do not handle resource target
        onTarget(null);
      } else {
        // Handle resource drag
        onFileDragTarget(null);
        if (!isOverShallow) {
          onTarget(null);
          return;
        }
        const dragId = (item as IResourceData).id;
        if (dragId === data.id) {
          onTarget(null);
          return;
        }
        onTarget(data);
      }
    },
    drop(item, monitor) {
      const itemType = monitor.getItemType();
      if (itemType === NativeTypes.FILE) {
        // Debounce: Prevent multiple drop triggers
        if (monitor.didDrop()) {
          return;
        }

        // Handle file drop
        const fileItem = item as { files: File[] };
        const validFiles = fileItem.files.filter(file =>
          isValidFileType(file.name)
        );
        if (validFiles.length > 0) {
          const fileList = new DataTransfer();
          validFiles.forEach(file => fileList.items.add(file));
          void onUpload(spaceType, data.id, fileList.files);
        } else {
          toast(t('upload.invalid_ext'), { position: 'bottom-right' });
        }
        onFileDragTarget(null);
      } else {
        // Handle resource drop
        onDrop(item as IResourceData, target);
      }
    },
  });

  // Cleanup: When drag leaves this node (including its children), make sure to clear file highlight
  useEffect(() => {
    if (!isOverHere && isFileDragOver) {
      onFileDragTarget(null);
    }
  }, [isOverHere, isFileDragOver, onFileDragTarget, data.id]);

  const handleExpand = () => {
    onExpand(spaceType, data.id);
  };
  const handleActiveKey = () => {
    const isActive = data.id === activeKey;
    if (data.has_children) {
      if (isActive) {
        onExpand(spaceType, data.id);
      } else {
        onActiveKey(data.id);
        if (!expand) {
          onExpand(spaceType, data.id);
        }
      }
    } else {
      onActiveKey(data.id);
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
      handleActiveKey();
    }, CLICK_DEBOUNCE_DELAY);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
    // Fire event to close other editing items first
    app.fire('start_rename', data.id);
  };

  const handleBlur = () => {
    // Skip if blur is not enabled yet (prevents immediate blur when menu closes)
    if (!isBlurEnabledRef.current || !isEditing) {
      return;
    }
    handleSave();
  };

  const handleSave = async () => {
    isBlurEnabledRef.current = false;
    const trimmedName = editName.trim();
    setIsEditing(false);
    if (trimmedName && trimmedName !== data.name) {
      try {
        await onRename(data.id, trimmedName);
      } catch {
        setEditName(data.name || '');
      }
    } else {
      setEditName(data.name || '');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      isBlurEnabledRef.current = false;
      setIsEditing(false);
      setEditName(data.name || '');
    }
  };

  // Keep isEditingRef in sync with isEditing state
  useEffect(() => {
    isEditingRef.current = isEditing;
  }, [isEditing]);

  useEffect(() => {
    if (isEditing) {
      // Reset blur flag
      isBlurEnabledRef.current = false;

      // Use setTimeout to ensure input is rendered and focused properly
      const focusTimer = setTimeout(() => {
        if (inputRef.current && isEditingRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, FOCUS_DELAY);

      // Enable blur handler after a short delay to prevent immediate blur when menu closes
      const blurTimer = setTimeout(() => {
        // Only enable blur if still in editing mode
        if (isEditingRef.current) {
          isBlurEnabledRef.current = true;
        }
      }, BLUR_ENABLE_DELAY);

      return () => {
        clearTimeout(focusTimer);
        clearTimeout(blurTimer);
        isBlurEnabledRef.current = false;
      };
    }
  }, [isEditing]);

  // Listen for start_rename event to trigger inline editing
  useEffect(() => {
    return app.on('start_rename', (resourceId: string) => {
      if (resourceId === data.id) {
        setEditName(data.name || '');
        setIsEditing(true);
      } else {
        // Close current editing when another item starts renaming
        isBlurEnabledRef.current = false;
        setIsEditing(false);
        setEditName(data.name || '');
      }
    });
  }, [app, data.id, data.name]);

  useEffect(() => {
    drag(ref);
    drop(ref);
  }, [drag, drop]);

  return (
    <SidebarMenuItem>
      <Collapsible
        open={expand}
        className={cn('group/collapsible', {
          '[&[data-state=open]>span>div>div>button>svg:first-child]:rotate-90':
            expand && expanding !== data.id && data.has_children,
        })}
      >
        <CollapsibleTrigger asChild>
          <ContextMenuMain {...props}>
            <div className="group/sidebar-item my-[1px] rounded-[6px] hover:bg-sidebar-accent">
              <SidebarMenuButton
                asChild
                className="gap-1 py-1.5 h-auto data-[active=true]:font-normal group-has-[[data-sidebar=menu-action]]/menu-item:pr-1 group-hover/sidebar-item:!pr-[30px] data-[active=true]:bg-[#E2E2E6] dark:data-[active=true]:bg-[#363637] transition-none"
                onClick={handleClick}
                onDoubleClick={handleDoubleClick}
                isActive={data.id == activeKey}
              >
                <div
                  ref={ref}
                  style={dragStyle}
                  className={cn('flex list cursor-pointer', {
                    'pl-1': data.has_children,
                    'pl-[28px]': !data.has_children,
                    'bg-sidebar-accent text-sidebar-accent-foreground':
                      (target && target.id === data.id) || isFileDragOver,
                  })}
                >
                  {data.has_children &&
                    (expanding === data.id ? (
                      <Button
                        size="icon"
                        variant="outline"
                        className="size-[20px] bg-transparent shadow-none border-none hover:bg-transparent"
                      >
                        <LoaderCircle className="transition-transform animate-spin" />
                      </Button>
                    ) : (
                      <Button
                        size="icon"
                        variant="outline"
                        className="size-[20px] bg-transparent shadow-none border-none text-[#8F959E] hover:bg-transparent"
                        onClick={event => {
                          event.preventDefault();
                          event.stopPropagation();
                          handleExpand();
                        }}
                      >
                        <Arrow className="transition-transform" />
                      </Button>
                    ))}
                  <ResourceIcon expand={expand} resource={data} />
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
                      className="flex-1 min-w-0 bg-transparent border border-primary rounded px-1 outline-none text-sm caret-blue-500"
                    />
                  ) : (
                    <span className="truncate flex-1">
                      {data.name || t('untitled')}
                    </span>
                  )}
                </div>
              </SidebarMenuButton>
              <Action {...props} />
            </div>
          </ContextMenuMain>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub className="pr-0 py-0 mr-0 gap-0">
            {data.has_children &&
              Array.isArray(data.children) &&
              data.children.length > 0 &&
              data.children.map((item: IResourceData) => (
                <Tree {...props} data={item} key={item.id} />
              ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  );
}
