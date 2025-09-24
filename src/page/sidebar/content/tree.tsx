import { ChevronRight, LoaderCircle } from 'lucide-react';
import { useEffect, useRef } from 'react';
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
import { IResourceData } from '@/interface';
import { cn } from '@/lib/utils';
import { ISidebarProps } from '@/page/sidebar/interface';

import Action from './action';
import ContextMenuMain from './contextMenu';
import ResourceIcon from './resourceIcon.tsx';

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
          onUpload(spaceType, data.id, fileList.files);
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
    onActiveKey(data.id);
  };

  useEffect(() => {
    drag(ref);
    drop(ref);
  }, []);

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
            <div>
              <SidebarMenuButton
                asChild
                className="gap-1 py-2 h-auto"
                onClick={handleActiveKey}
                isActive={data.id == activeKey}
              >
                <div
                  ref={ref}
                  style={dragStyle}
                  className={cn('flex list cursor-pointer', {
                    'pl-1': data.has_children,
                    'pl-8': !data.has_children,
                    'bg-sidebar-accent text-sidebar-accent-foreground':
                      (target && target.id === data.id) || isFileDragOver,
                  })}
                >
                  {data.has_children &&
                    (expanding === data.id ? (
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-6 w-6 bg-transparent shadow-none border-none hover:bg-sidebar-border"
                      >
                        <LoaderCircle className="transition-transform animate-spin" />
                      </Button>
                    ) : (
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-6 w-6 bg-transparent shadow-none border-none hover:bg-sidebar-border"
                        onClick={event => {
                          event.preventDefault();
                          event.stopPropagation();
                          handleExpand();
                        }}
                      >
                        <ChevronRight className="transition-transform" />
                      </Button>
                    ))}
                  <ResourceIcon expand={expand} resource={data} />
                  <span className="truncate">{data.name || t('untitled')}</span>
                </div>
              </SidebarMenuButton>
              <Action {...props} />
            </div>
          </ContextMenuMain>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub className="pr-0 mr-0">
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
