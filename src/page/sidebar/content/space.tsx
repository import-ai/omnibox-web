import { LoaderCircle, MoreHorizontal } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useDrop } from 'react-dnd';
import { NativeTypes } from 'react-dnd-html5-backend';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Input } from '@/components/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { ALLOW_FILE_EXTENSIONS } from '@/const';
import { IResourceData } from '@/interface';
import { cn } from '@/lib/utils';

import Tree, { ITreeProps } from './tree';

// Helper function to validate file extensions
const isValidFileType = (fileName: string): boolean => {
  const allowedExtensions = ALLOW_FILE_EXTENSIONS.split(',').map(ext =>
    ext.trim()
  );
  const fileExtension = '.' + fileName.split('.').pop()?.toLowerCase();
  return allowedExtensions.includes(fileExtension);
};

export default function Space(props: ITreeProps) {
  const {
    data,
    editingKey,
    spaceType,
    onCreate,
    onUpload,
    onDrop,
    target,
    onTarget,
    fileDragTarget,
    onFileDragTarget,
  } = props;
  const { t } = useTranslation();
  const [open, onOpen] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  const isDragOver = fileDragTarget === data.id;
  const isResourceDragOver = target && target.id === data.id;
  const handleSelect = () => {
    fileInputRef.current?.click();
  };
  const handleHeaderToggle = () => {
    onOpen(val => !val);
  };
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) {
      return;
    }
    onUpload(spaceType, data.id, e.target.files).finally(() => {
      fileInputRef.current!.value = '';
    });
  };

  // File and resource drop handling
  const [{ canDrop, isOver }, drop] = useDrop({
    accept: [NativeTypes.FILE, 'card'],
    drop: (item, monitor) => {
      // Debounce: prevent multiple drop triggers
      if (monitor.didDrop()) {
        return;
      }

      const itemType = monitor.getItemType();
      if (itemType === NativeTypes.FILE) {
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
      } else if (itemType === 'card') {
        // Handle resource drop to root directory
        onDrop(item as IResourceData, data);
        onTarget(null);
      }
    },
    collect: monitor => ({
      isOver: monitor.isOver({ shallow: true }),
      canDrop: monitor.canDrop(),
    }),
    hover: (item, monitor) => {
      const isOverShallow = monitor.isOver({ shallow: true });
      const itemType = monitor.getItemType();

      if (itemType === NativeTypes.FILE) {
        if (isOverShallow) {
          onFileDragTarget(data.id);
        }
        // Do not handle resource target for files
        onTarget(null);
      } else if (itemType === 'card') {
        // Handle resource drag to root directory
        onFileDragTarget(null);
        if (!isOverShallow) {
          onTarget(null);
          return;
        }
        const dragId = (item as IResourceData).id;
        // Prevent dropping on self (though root directory shouldn't have same id as dragged item)
        if (dragId === data.id) {
          onTarget(null);
          return;
        }
        onTarget(data);
      }
    },
  });

  // Bind drop to the actual DOM of the group container
  useEffect(() => {
    if (groupRef.current) {
      drop(groupRef);
    }
  }, [drop]);

  // Cleanup: when drag leaves this group (including its child nodes), ensure to clear highlight target
  useEffect(() => {
    if (!isOver) {
      if (fileDragTarget === data.id) {
        onFileDragTarget(null);
      }
      if (target && target.id === data.id) {
        onTarget(null);
      }
    }
  }, [isOver, fileDragTarget, target, data.id, onFileDragTarget, onTarget]);

  return (
    <SidebarGroup
      ref={groupRef}
      className={cn('pr-0', {
        'bg-sidebar-border text-sidebar-accent-foreground':
          isDragOver || isResourceDragOver || (canDrop && isOver),
      })}
    >
      <SidebarMenuButton className="group/sidebar-header pt-0 pb-[1px] h-[32px]">
        <div className="relative w-full h-full">
          <SidebarGroupLabel
            onClick={handleHeaderToggle}
            className="h-full font-normal block leading-[32px] mr-[16px] text-[#8F959E]"
          >
            {spaceType ? t(spaceType) : ''}
          </SidebarGroupLabel>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuAction className="group-hover/sidebar-header:opacity-100 group-hover/sidebar-header:pointer-events-auto pointer-events-none opacity-0 my-1.5 size-[16px] top-[2px] right-0 text-[#8F959E] focus-visible:outline-none focus-visible:ring-transparent">
                {data.id === editingKey ? (
                  <LoaderCircle className="transition-transform animate-spin" />
                ) : (
                  <MoreHorizontal className="focus-visible:outline-none focus-visible:ring-transparent rounded-[2px] hover:bg-[#DFDFE3]" />
                )}
              </SidebarMenuAction>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" sideOffset={10} align="start">
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => {
                  onCreate(spaceType, data.id, 'doc');
                }}
              >
                {t('actions.create_file')}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => {
                  onCreate(spaceType, data.id, 'folder');
                }}
              >
                {t('actions.create_folder')}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={handleSelect}
              >
                {t('actions.upload_file')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Input
            multiple
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleUpload}
            accept={ALLOW_FILE_EXTENSIONS}
          />
        </div>
      </SidebarMenuButton>
      {open && (
        <SidebarGroupContent>
          <SidebarMenu className="gap-[2px]">
            {data.has_children &&
              Array.isArray(data.children) &&
              data.children.length > 0 &&
              data.children.map((item: IResourceData) => (
                <Tree {...props} data={item} key={item.id} />
              ))}
          </SidebarMenu>
        </SidebarGroupContent>
      )}
    </SidebarGroup>
  );
}
