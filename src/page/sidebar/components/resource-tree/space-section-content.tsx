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
import { menuIconClass, menuItemClass } from '@/page/sidebar/constants';
import type { TreeNode } from '@/page/sidebar/store';
import { useSidebarStore } from '@/page/sidebar/store';
import { isValidFileType } from '@/page/sidebar/utils';

import ResourceNode from './resource-node';

interface SpaceSectionContentProps {
  rootNode: TreeNode;
  spaceType: SpaceType;
  namespaceId: string;
  rootId: string;
  isOpen: boolean;
}

export function SpaceSectionContent({
  rootNode,
  spaceType,
  namespaceId,
  rootId,
  isOpen,
}: SpaceSectionContentProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isTouch = useIsTouch();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);

  const upload = useSidebarStore(s => s.upload[rootId]);

  const handleCreateFolder = () => {
    useSidebarStore.getState().openCreateFolderDialog(rootId);
  };

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
            .uploadFiles(rootId, fileList.files)
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

  const handleHeaderToggle = () => {
    useSidebarStore.getState().toggleSpace(spaceType);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    useSidebarStore
      .getState()
      .uploadFiles(rootId, files)
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
                  {upload !== undefined ? (
                    <SidebarMenuAction
                      asChild
                      className="pointer-events-none right-0 top-px my-1.5 size-4 text-neutral-400 focus-visible:outline-none focus-visible:ring-transparent group-hover/sidebar-header:pointer-events-auto"
                    >
                      <span>
                        {upload ? (
                          <TooltipProvider>
                            <Tooltip delayDuration={0}>
                              <TooltipTrigger asChild>
                                <span className="[&>svg]:size-4">
                                  <Spinner />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>{upload}</TooltipContent>
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
                        'right-0 top-0.5 my-1.5 size-4 text-neutral-400 hover:bg-transparent focus-visible:outline-none focus-visible:ring-transparent',
                        isTouch
                          ? 'pointer-events-auto opacity-100'
                          : 'pointer-events-none opacity-0 group-hover/sidebar-header:pointer-events-auto group-hover/sidebar-header:opacity-100'
                      )}
                    >
                      <MoreHorizontal className="rounded-sm hover:bg-[#DFDFE3] focus-visible:outline-none focus-visible:ring-transparent" />
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
          <SidebarMenu className="gap-0.5">
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
