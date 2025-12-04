import {
  FilePlus,
  FolderPlus,
  LoaderCircle,
  MessageSquarePlus,
  MessageSquareQuote,
  MonitorUp,
  MoreHorizontal,
  Move,
  Pencil,
  SquarePen,
  Trash2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { SidebarMenuAction } from '@/components/ui/sidebar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ALLOW_FILE_EXTENSIONS } from '@/const';
import useApp from '@/hooks/use-app';
import { useIsTouch } from '@/hooks/use-is-touch';
import { cn } from '@/lib/utils';
import MoveTo from '@/page/resource/actions/move';
import { ISidebarProps } from '@/page/sidebar/interface';

export default function Action(props: ISidebarProps) {
  const {
    data,
    onUpload,
    onCreate,
    onDelete,
    onRename,
    progress,
    spaceType,
    editingKey,
    onActiveKey,
    namespaceId,
  } = props;
  const app = useApp();
  const { t } = useTranslation();
  const isTouch = useIsTouch();
  const [moveTo, setMoveTo] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameName, setRenameName] = useState(data.name || '');
  const renameInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 同步 data.name 变化到 renameName
  useEffect(() => {
    setRenameName(data.name || '');
  }, [data.name]);
  const handleCreateFile = () => {
    onCreate(spaceType, data.id, 'doc');
  };
  const handleCreateFolder = () => {
    onCreate(spaceType, data.id, 'folder');
  };
  const handleEdit = () => {
    onActiveKey(data.id, true);
  };
  const handleRename = () => {
    setRenameName(data.name || '');
    setIsRenaming(true);
    setTimeout(() => {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }, 0);
  };
  const handleRenameSave = async () => {
    const trimmedName = renameName.trim();
    setIsRenaming(false);
    if (trimmedName && trimmedName !== data.name) {
      try {
        await onRename(data.id, trimmedName);
      } catch {
        setRenameName(data.name || '');
      }
    } else {
      setRenameName(data.name || '');
    }
  };
  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRenameSave();
    } else if (e.key === 'Escape') {
      setIsRenaming(false);
      setRenameName(data.name || '');
    }
  };
  const handleAddToChat = () => {
    if (!location.pathname.includes('/chat')) {
      onActiveKey('chat');
      setTimeout(() => {
        app.fire('context', data, 'resource');
      }, 100);
    } else {
      app.fire('context', data, 'resource');
    }
  };
  const handleAddAllToChat = () => {
    if (!location.pathname.includes('/chat')) {
      onActiveKey('chat');
      setTimeout(() => {
        app.fire('context', data, 'folder');
      }, 100);
    } else {
      app.fire('context', data, 'folder');
    }
  };
  const handleMoveTo = () => {
    setMoveTo(true);
  };
  const handleDelete = () => {
    onDelete(spaceType, data.id, data.parent_id);
  };
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
  const handleMoveFinished = (resourceId: string, targetId: string) => {
    setMoveTo(false);
    app.fire('move_resource', resourceId, targetId);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {data.id === editingKey ? (
            <>
              {progress ? (
                <TooltipProvider>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <SidebarMenuAction className="group-hover/sidebar-item:pointer-events-auto pointer-events-none size-[16px] peer-data-[size=default]/menu-button:top-[8px] right-2 focus-visible:outline-none focus-visible:ring-transparent">
                        <LoaderCircle className="transition-transform animate-spin" />
                      </SidebarMenuAction>
                    </TooltipTrigger>
                    <TooltipContent>{progress}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <SidebarMenuAction className="group-hover/sidebar-item:pointer-events-auto pointer-events-none size-[16px] peer-data-[size=default]/menu-button:top-[8px] right-2 focus-visible:outline-none focus-visible:ring-transparent">
                  <LoaderCircle className="transition-transform animate-spin" />
                </SidebarMenuAction>
              )}
            </>
          ) : (
            <SidebarMenuAction
              className={cn(
                'size-4 peer-data-[size=default]/menu-button:top-2 right-2 focus-visible:outline-none focus-visible:ring-transparent',
                isTouch
                  ? 'opacity-100 pointer-events-auto'
                  : 'group-hover/sidebar-item:opacity-100 group-hover/sidebar-item:pointer-events-auto pointer-events-none opacity-0'
              )}
            >
              <MoreHorizontal className="focus-visible:outline-none focus-visible:ring-transparent rounded-[2px] hover:bg-[#DFDFE3] text-[#8F959E] hover:text-[#8F959E]" />
            </SidebarMenuAction>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" sideOffset={10}>
          <DropdownMenuItem
            className="cursor-pointer gap-2 text-popover-foreground"
            onClick={handleCreateFile}
          >
            <FilePlus className="size-4 text-neutral-500" />
            {t('actions.create_file')}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer gap-2 text-popover-foreground"
            onClick={handleCreateFolder}
          >
            <FolderPlus className="size-4 text-neutral-500" />
            {t('actions.create_folder')}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer gap-2 text-popover-foreground"
            onClick={handleSelect}
          >
            <MonitorUp className="size-4 text-neutral-500" />
            {t('actions.upload_file')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {isRenaming ? (
            <div className="px-2 py-1.5">
              <input
                ref={renameInputRef}
                type="text"
                value={renameName}
                onChange={e => setRenameName(e.target.value)}
                onBlur={handleRenameSave}
                onKeyDown={handleRenameKeyDown}
                className="w-full bg-transparent border border-primary rounded px-2 py-1 outline-none text-sm caret-[#3B82F6]"
              />
            </div>
          ) : (
            <DropdownMenuItem
              className="cursor-pointer gap-2 text-popover-foreground"
              onClick={handleRename}
            >
              <Pencil className="size-4 text-neutral-500" />
              {t('actions.rename')}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            className="cursor-pointer gap-2 text-popover-foreground"
            onClick={handleEdit}
          >
            <SquarePen className="size-4 text-neutral-500" />
            {t('edit')}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer gap-2 text-popover-foreground"
            onClick={handleMoveTo}
          >
            <Move className="size-4 text-neutral-500" />
            {t('actions.move_to')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />

          {data.has_children && (
            <DropdownMenuItem
              className="cursor-pointer gap-2 text-popover-foreground"
              onClick={handleAddAllToChat}
            >
              <MessageSquarePlus className="size-4 text-neutral-500" />
              {t('actions.add_all_to_context')}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            className="cursor-pointer gap-2 text-popover-foreground"
            onClick={handleAddToChat}
          >
            <MessageSquareQuote className="size-4 text-neutral-500" />
            {data.has_children
              ? t('actions.add_it_only_to_context')
              : t('actions.add_it_to_context')}
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer gap-2 text-destructive"
            onClick={handleDelete}
          >
            <Trash2 className="size-4" />
            {t('delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <MoveTo
        open={moveTo}
        resourceId={data.id}
        onOpenChange={setMoveTo}
        namespaceId={namespaceId}
        onFinished={handleMoveFinished}
      />
      <Input
        multiple
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={handleUpload}
        accept={ALLOW_FILE_EXTENSIONS}
      />
    </>
  );
}
