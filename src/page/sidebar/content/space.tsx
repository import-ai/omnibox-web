import { FilePlus, FolderPlus, MonitorUp, MoreHorizontal } from 'lucide-react';
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
import { Spinner } from '@/components/ui/spinner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ALLOW_FILE_EXTENSIONS } from '@/const';
import { useIsTouch } from '@/hooks/use-is-touch';
import { IResourceData } from '@/interface';
import { cn } from '@/lib/utils';

import { CreateFolderDialog } from './create-folder-dialog';
import { menuIconClass, menuItemClass } from './styles';
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
    progress,
    onDrop,
    target,
    onTarget,
    fileDragTarget,
    onFileDragTarget,
  } = props;
  const { t } = useTranslation();
  const isTouch = useIsTouch();
  const [open, onOpen] = useState(true);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
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
  const handleCreateFolder = () => {
    setCreateFolderOpen(true);
  };
  const handleConfirmCreateFolder = (folderName: string) => {
    onCreate(spaceType, data.id, 'folder', folderName);
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
      <SidebarMenuButton className="group/sidebar-header pt-0 pb-[1px] h-8">
        <div className="relative w-full h-full">
          <SidebarGroupLabel
            onClick={handleHeaderToggle}
            className="h-full font-normal block leading-8 mr-4 text-neutral-400"
          >
            {spaceType ? t(spaceType) : ''}
          </SidebarGroupLabel>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {data.id === editingKey ? (
                <SidebarMenuAction
                  asChild
                  className="group-hover/sidebar-header:pointer-events-auto pointer-events-none my-1.5 size-[16px] top-[2px] right-0 text-neutral-400 focus-visible:outline-none focus-visible:ring-transparent"
                >
                  <span>
                    {progress ? (
                      <TooltipProvider>
                        <Tooltip delayDuration={0}>
                          <TooltipTrigger asChild>
                            <span className="[&>svg]:size-[16px]">
                              <Spinner />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>{progress}</TooltipContent>
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
                    'my-1.5 size-4 top-0.5 right-0 text-neutral-400 hover:bg-transparent focus-visible:outline-none focus-visible:ring-transparent',
                    isTouch
                      ? 'opacity-100 pointer-events-auto'
                      : 'group-hover/sidebar-header:opacity-100 group-hover/sidebar-header:pointer-events-auto pointer-events-none opacity-0'
                  )}
                >
                  <MoreHorizontal className="focus-visible:outline-none focus-visible:ring-transparent rounded-[2px] hover:bg-[#DFDFE3]" />
                </SidebarMenuAction>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" sideOffset={10} align="start">
              <DropdownMenuItem
                className={menuItemClass}
                onClick={() => {
                  onCreate(spaceType, data.id, 'doc');
                }}
              >
                <FilePlus className={menuIconClass} />
                {t('actions.create_file')}
              </DropdownMenuItem>
              <DropdownMenuItem
                className={menuItemClass}
                onClick={handleCreateFolder}
              >
                <FolderPlus className={menuIconClass} />
                {t('actions.create_folder')}
              </DropdownMenuItem>
              <DropdownMenuItem
                className={menuItemClass}
                onClick={handleSelect}
              >
                <MonitorUp className={menuIconClass} />
                {t('actions.upload_file')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <CreateFolderDialog
            open={createFolderOpen}
            onOpenChange={setCreateFolderOpen}
            onConfirm={handleConfirmCreateFolder}
          />
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
