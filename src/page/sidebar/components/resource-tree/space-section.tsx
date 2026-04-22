import { FilePlus, FolderPlus, MonitorUp, MoreHorizontal } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useDrop } from 'react-dnd';
import { NativeTypes } from 'react-dnd-html5-backend';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Input } from '@/components/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/tooltip';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
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
import { ALLOW_FILE_EXTENSIONS } from '@/const';
import { useIsTouch } from '@/hooks/use-is-touch';
import { SpaceType } from '@/interface';
import { cn } from '@/lib/utils';
import { useIsSpaceExpanded, useNode, useRootId } from '@/page/sidebar/store';
import { useSidebarStore } from '@/page/sidebar/store';

import { CreateFolderDialog } from './create-folder-dialog';
import { menuIconClass, menuItemClass } from './node-styles';
import ResourceNode from './resource-node';

const isValidFileType = (fileName: string): boolean => {
  const allowedExtensions = ALLOW_FILE_EXTENSIONS.split(',').map(ext =>
    ext.trim()
  );
  const fileExtension = '.' + fileName.split('.').pop()?.toLowerCase();
  return allowedExtensions.includes(fileExtension);
};

interface SpaceSectionProps {
  spaceType: SpaceType;
  namespaceId: string;
}

export default function SpaceSection({
  spaceType,
  namespaceId,
}: SpaceSectionProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isTouch = useIsTouch();

  const rootId = useRootId(spaceType);
  const rootNode = useNode(rootId);
  const isOpen = useIsSpaceExpanded(spaceType);

  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);

  const isUploading = useSidebarStore(s => rootId in s.uploading);
  const uploadProgress = useSidebarStore(s => s.uploadProgress[rootId]);

  // File and resource drop handling
  const [fileDragTarget, setFileDragTarget] = useState<string | null>(null);
  const isDragOver = fileDragTarget === rootId;

  const [{ canDrop, isOver }, drop] = useDrop({
    accept: [NativeTypes.FILE, 'card'],
    drop: (item, monitor) => {
      if (monitor.didDrop()) return;
      const itemType = monitor.getItemType();
      if (itemType === NativeTypes.FILE) {
        const fileItem = item as { files: File[] };
        const validFiles = fileItem.files.filter(file =>
          isValidFileType(file.name)
        );
        if (validFiles.length > 0) {
          const fileList = new DataTransfer();
          validFiles.forEach(file => fileList.items.add(file));
          useSidebarStore
            .getState()
            .upload(rootId, fileList.files)
            .then(id => {
              useSidebarStore.getState().activate(id);
              navigate(`/${namespaceId}/${id}`, {
                state: { fromSidebar: true },
              });
              toast.success(
                t('upload.success', { count: fileList.files.length })
              );
            })
            .catch(() => {
              toast.error(t('upload.failed'));
            });
        } else {
          toast(t('upload.invalid_ext'), { position: 'bottom-right' });
        }
        setFileDragTarget(null);
      } else if (itemType === 'card') {
        const dragItem = item as { id: string };
        if (dragItem.id !== rootId) {
          useSidebarStore
            .getState()
            .move(dragItem.id, rootId)
            .catch(() => {
              toast.error(t('move.failed'));
            });
        }
        setFileDragTarget(null);
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
        if (isOverShallow) setFileDragTarget(rootId);
      } else if (itemType === 'card') {
        setFileDragTarget(null);
        if (!isOverShallow) return;
        const dragId = (item as { id: string }).id;
        if (dragId === rootId) return;
        // Resource drag target is handled elsewhere
      }
    },
  });

  useEffect(() => {
    if (groupRef.current) {
      drop(groupRef);
    }
  }, [drop]);

  useEffect(() => {
    if (!isOver && fileDragTarget === rootId) {
      setFileDragTarget(null);
    }
  }, [isOver, fileDragTarget, rootId]);

  if (!rootNode) return null;

  const handleHeaderToggle = () => {
    useSidebarStore.getState().toggleSpace(spaceType);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    useSidebarStore
      .getState()
      .upload(rootId, files)
      .then(id => {
        useSidebarStore.getState().activate(id);
        navigate(`/${namespaceId}/${id}`, { state: { fromSidebar: true } });
        toast.success(t('upload.success', { count: files.length }));
      })
      .catch(err => {
        toast.error(err?.message || t('upload.failed'));
      })
      .finally(() => {
        fileInputRef.current!.value = '';
      });
  };

  const handleCreateFolder = () => {
    setCreateFolderOpen(true);
  };

  const handleConfirmCreateFolder = (folderName: string) => {
    return useSidebarStore
      .getState()
      .create(rootId, 'folder', folderName)
      .then(() => {
        // Folders don't navigate
      })
      .catch(err => {
        toast.error(err?.message || t('create.failed'));
        throw err;
      });
  };

  return (
    <SidebarGroup
      ref={groupRef}
      className={cn('pr-0', {
        'bg-sidebar-border text-sidebar-accent-foreground':
          isDragOver || (canDrop && isOver),
      })}
    >
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <SidebarMenuButton className="group/sidebar-header h-8 pb-px pt-0">
            <div className="relative size-full">
              <SidebarGroupLabel
                onClick={handleHeaderToggle}
                className="mr-4 block h-full font-normal leading-8 text-neutral-400"
              >
                {spaceType ? t(spaceType) : ''}
              </SidebarGroupLabel>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  {isUploading ? (
                    <SidebarMenuAction
                      asChild
                      className="pointer-events-none right-0 top-px my-1.5 size-4 text-neutral-400 focus-visible:outline-none focus-visible:ring-transparent group-hover/sidebar-header:pointer-events-auto"
                    >
                      <span>
                        {uploadProgress ? (
                          <TooltipProvider>
                            <Tooltip delayDuration={0}>
                              <TooltipTrigger asChild>
                                <span className="[&>svg]:size-4">
                                  <Spinner />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>{uploadProgress}</TooltipContent>
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
                      <MoreHorizontal className="rounded-[2px] hover:bg-[#DFDFE3] focus-visible:outline-none focus-visible:ring-transparent" />
                    </SidebarMenuAction>
                  )}
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" sideOffset={10} align="start">
                  <DropdownMenuItem
                    className={menuItemClass}
                    onClick={() => {
                      useSidebarStore
                        .getState()
                        .create(rootId, 'doc')
                        .then(id => {
                          useSidebarStore.getState().activate(id);
                          navigate(`/${namespaceId}/${id}/edit`, {
                            state: { fromSidebar: true },
                          });
                        })
                        .catch(err => {
                          toast.error(err?.message || t('create.failed'));
                        });
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
                    onClick={() => fileInputRef.current?.click()}
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
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem
            className={menuItemClass}
            onClick={() => {
              useSidebarStore
                .getState()
                .create(rootId, 'doc')
                .then(id => {
                  navigate(`/${namespaceId}/${id}/edit`, {
                    state: { fromSidebar: true },
                  });
                })
                .catch(err => {
                  toast.error(err?.message || t('create.failed'));
                });
            }}
          >
            <FilePlus className={menuIconClass} />
            {t('actions.create_file')}
          </ContextMenuItem>
          <ContextMenuItem
            className={menuItemClass}
            onClick={handleCreateFolder}
          >
            <FolderPlus className={menuIconClass} />
            {t('actions.create_folder')}
          </ContextMenuItem>
          <ContextMenuItem
            className={menuItemClass}
            onClick={() => fileInputRef.current?.click()}
          >
            <MonitorUp className={menuIconClass} />
            {t('actions.upload_file')}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      {isOpen && (
        <SidebarGroupContent>
          <SidebarMenu className="gap-px">
            {rootNode.hasChildren &&
              rootNode.children.length > 0 &&
              rootNode.children.map(childId => (
                <ResourceNode nodeId={childId} key={childId} />
              ))}
          </SidebarMenu>
        </SidebarGroupContent>
      )}
    </SidebarGroup>
  );
}
