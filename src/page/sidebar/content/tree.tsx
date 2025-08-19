import { ChevronRight, LoaderCircle } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { NativeTypes } from 'react-dnd-html5-backend';
import { useTranslation } from 'react-i18next';

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
import { IResourceData } from '@/interface';
import { cn } from '@/lib/utils';
import { ISidebarProps } from '@/page/sidebar/interface';

import Action from './action';
import ContextMenuMain from './contextMenu';
import Icon from './icon';

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
    fileDragTarget,
    onFileDragTarget,
  } = props;
  const ref = useRef(null);
  const { t } = useTranslation();
  const expand = expands.includes(data.id);
  const isFileDragOver = fileDragTarget === data.id;
  const [dragStyle, drag] = useDrag({
    type: 'card',
    item: data,
    collect: monitor => ({
      opacity: monitor.isDragging() ? 0.5 : 1,
    }),
  });
  const [, drop] = useDrop({
    accept: ['card', NativeTypes.FILE],
    hover: (item, monitor) => {
      if (!ref.current) {
        onTarget(null);
        return;
      }

      const itemType = monitor.getItemType();
      const isOverShallow = monitor.isOver({ shallow: true });

      if (itemType === NativeTypes.FILE) {
        // Handle file drag over - only set if directly over this element
        if (isOverShallow) {
          onFileDragTarget(data.id);
        }
        onTarget(null); // Don't set target for file drops
      } else {
        // Handle resource drag over
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
        // Prevent multiple uploads - only handle if no other drop has occurred
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
          onUpload(spaceType, data.id, fileList.files);
        }
        onFileDragTarget(null);
      } else {
        // Handle resource drop
        onDrop(item as IResourceData, target);
      }
    },
  });
  const handleExpand = () => {
    onExpand(spaceType, data.id);
  };
  const handleActiveKey = () => {
    onActiveKey(data.id);
  };

  useEffect(() => {
    drag(ref);
    drop(ref);
  }, []);

  if (data.id === 'empty') {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton disabled>{t('no_pages_inside')}</SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <Collapsible
        open={expand}
        className={cn('group/collapsible', {
          '[&[data-state=open]>span>div>div>svg:first-child]:rotate-90':
            expand && expanding !== data.id,
        })}
      >
        <CollapsibleTrigger asChild>
          <ContextMenuMain {...props}>
            <div>
              <SidebarMenuButton
                asChild
                className="gap-1"
                onClick={handleActiveKey}
                isActive={data.id == activeKey}
              >
                <div
                  ref={ref}
                  style={dragStyle}
                  className={cn(
                    'flex cursor-pointer relative before:absolute before:content-[""] before:hidden before:left-[13px] before:right-[4px] before:h-[2px] before:bg-blue-500',
                    {
                      'bg-sidebar-accent text-sidebar-accent-foreground':
                        target && target.id === data.id,
                      'bg-blue-50 border-2 border-dashed border-blue-500':
                        isFileDragOver,
                    }
                  )}
                >
                  {expanding === data.id ? (
                    <LoaderCircle className="transition-transform animate-spin" />
                  ) : (
                    <ChevronRight
                      className="transition-transform"
                      onClick={event => {
                        event.preventDefault();
                        event.stopPropagation();
                        handleExpand();
                      }}
                    />
                  )}
                  <Icon expand={expand} resource={data} />
                  <span className="truncate">{data.name || t('untitled')}</span>
                </div>
              </SidebarMenuButton>
              <Action {...props} />
            </div>
          </ContextMenuMain>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub className="pr-0 mr-0">
            {Array.isArray(data.children) &&
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
