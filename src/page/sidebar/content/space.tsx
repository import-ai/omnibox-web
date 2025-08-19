import { LoaderCircle, MoreHorizontal } from 'lucide-react';
import { useRef } from 'react';
import { useDrop } from 'react-dnd';
import { NativeTypes } from 'react-dnd-html5-backend';
import { useTranslation } from 'react-i18next';

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
    fileDragTarget,
    onFileDragTarget,
  } = props;
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDragOver = fileDragTarget === data.id;
  const handleSelect = () => {
    fileInputRef.current?.click();
  };
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) {
      return;
    }
    onUpload(spaceType, data.id, e.target.files).finally(() => {
      fileInputRef.current!.value = '';
    });
  };

  // File drop handling
  const [{ canDrop, isOver }, drop] = useDrop({
    accept: [NativeTypes.FILE],
    drop: (item: { files: File[] }, monitor) => {
      // Prevent multiple uploads - only handle if no other drop has occurred
      if (monitor.didDrop()) {
        return;
      }

      const validFiles = item.files.filter(file => isValidFileType(file.name));
      if (validFiles.length > 0) {
        const fileList = new DataTransfer();
        validFiles.forEach(file => fileList.items.add(file));
        onUpload(spaceType, data.id, fileList.files);
      }
      onFileDragTarget(null);
    },
    collect: monitor => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
    hover: (item, monitor) => {
      const isOverShallow = monitor.isOver({ shallow: true });
      if (isOverShallow) {
        onFileDragTarget(data.id);
      } else {
        onFileDragTarget(null); // Reset when not over this element
      }
    },
  });

  return (
    <SidebarGroup
      ref={drop}
      className={cn({
        'bg-sidebar-accent/80 border-2 border-dashed border-sidebar-primary':
          isDragOver || (canDrop && isOver),
      })}
    >
      <div className="flex items-center justify-between">
        <SidebarGroupLabel>{spaceType ? t(spaceType) : ''}</SidebarGroupLabel>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuAction className="my-1.5 right-2 focus-visible:outline-none focus-visible:ring-transparent">
              {data.id === editingKey ? (
                <LoaderCircle className="transition-transform animate-spin" />
              ) : (
                <MoreHorizontal className="focus-visible:outline-none focus-visible:ring-transparent" />
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
            <DropdownMenuItem className="cursor-pointer" onClick={handleSelect}>
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
      <SidebarGroupContent>
        <SidebarMenu>
          {Array.isArray(data.children) &&
            data.children.length > 0 &&
            data.children.map((item: IResourceData) => (
              <Tree {...props} data={item} key={item.id} />
            ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
