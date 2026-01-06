import {
  FilePlus,
  FolderPlus,
  MessageSquarePlus,
  MessageSquareQuote,
  MonitorUp,
  MoreHorizontal,
  Move,
  Pencil,
  SquarePen,
  Trash2,
} from 'lucide-react';
import { useRef, useState } from 'react';
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
import { Spinner } from '@/components/ui/spinner';
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

import { CreateFolderDialog } from './create-folder-dialog';
import { menuIconClass, menuItemClass } from './styles';

export default function Action(props: ISidebarProps) {
  const {
    data,
    onUpload,
    onCreate,
    onDelete,
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreateFile = () => {
    onCreate(spaceType, data.id, 'doc');
  };
  const handleCreateFolder = () => {
    setCreateFolderOpen(true);
  };
  const handleConfirmCreateFolder = (folderName: string) => {
    onCreate(spaceType, data.id, 'folder', folderName);
  };
  const handleEdit = () => {
    onActiveKey(data.id, true);
  };
  const handleRename = (e: Event) => {
    // Prevent default menu close behavior
    e.preventDefault();
    // Manually close the menu
    setMenuOpen(false);
    // Delay to ensure dropdown menu is fully closed before triggering rename
    setTimeout(() => {
      app.fire('start_rename', data.id);
    }, 150);
  };
  const addToContext = (type: 'resource' | 'folder') => {
    const fireEvent = () => app.fire('context', data, type);
    if (location.pathname.includes('/chat')) {
      fireEvent();
    } else {
      onActiveKey('chat');
      setTimeout(fireEvent, 100);
    }
  };
  const handleAddToChat = () => addToContext('resource');
  const handleAddAllToChat = () => addToContext('folder');
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
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          {data.id === editingKey ? (
            <>
              {progress ? (
                <TooltipProvider>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <SidebarMenuAction className="group-hover/sidebar-item:pointer-events-auto pointer-events-none size-[16px] peer-data-[size=default]/menu-button:top-[8px] right-2 focus-visible:outline-none focus-visible:ring-transparent">
                        <Spinner />
                      </SidebarMenuAction>
                    </TooltipTrigger>
                    <TooltipContent>{progress}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <SidebarMenuAction className="group-hover/sidebar-item:pointer-events-auto pointer-events-none size-[16px] peer-data-[size=default]/menu-button:top-[8px] right-2 focus-visible:outline-none focus-visible:ring-transparent">
                  <Spinner />
                </SidebarMenuAction>
              )}
            </>
          ) : (
            <SidebarMenuAction
              asChild
              className={cn(
                'size-4 peer-data-[size=default]/menu-button:top-2 right-2 !text-neutral-400 hover:!text-sidebar-foreground hover:bg-transparent focus-visible:outline-none focus-visible:ring-transparent cursor-pointer',
                isTouch
                  ? 'opacity-100 pointer-events-auto'
                  : 'group-hover/sidebar-item:opacity-100 group-hover/sidebar-item:pointer-events-auto pointer-events-none opacity-0'
              )}
            >
              <MoreHorizontal className="focus-visible:outline-none focus-visible:ring-transparent cursor-pointer" />
            </SidebarMenuAction>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" sideOffset={10}>
          <DropdownMenuItem
            className={menuItemClass}
            onClick={handleCreateFile}
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
          <DropdownMenuItem className={menuItemClass} onClick={handleSelect}>
            <MonitorUp className={menuIconClass} />
            {t('actions.upload_file')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className={menuItemClass} onSelect={handleRename}>
            <SquarePen className={menuIconClass} />
            {t('actions.rename')}
          </DropdownMenuItem>
          <DropdownMenuItem className={menuItemClass} onClick={handleEdit}>
            <Pencil className={menuIconClass} />
            {t('edit')}
          </DropdownMenuItem>
          <DropdownMenuItem className={menuItemClass} onClick={handleMoveTo}>
            <Move className={menuIconClass} />
            {t('actions.move_to')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />

          {data.resource_type === 'folder' ? (
            <DropdownMenuItem
              className={menuItemClass}
              onClick={handleAddAllToChat}
            >
              <MessageSquarePlus className={menuIconClass} />
              {t('actions.add_all_to_context')}
            </DropdownMenuItem>
          ) : data.has_children ? (
            <>
              <DropdownMenuItem
                className={menuItemClass}
                onClick={handleAddAllToChat}
              >
                <MessageSquarePlus className={menuIconClass} />
                {t('actions.add_all_to_context')}
              </DropdownMenuItem>
              <DropdownMenuItem
                className={menuItemClass}
                onClick={handleAddToChat}
              >
                <MessageSquareQuote className={menuIconClass} />
                {t('actions.add_it_to_context')}
              </DropdownMenuItem>
            </>
          ) : (
            <DropdownMenuItem
              className={menuItemClass}
              onClick={handleAddToChat}
            >
              <MessageSquareQuote className={menuIconClass} />
              {t('actions.add_it_to_context')}
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="group cursor-pointer gap-2 data-[highlighted]:text-destructive"
            onClick={handleDelete}
          >
            <Trash2 className="size-4 text-neutral-500 dark:text-[#a1a1a1] group-hover:text-destructive" />
            {t('actions.move_to_trash')}
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
    </>
  );
}
