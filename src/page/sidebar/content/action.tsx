import {
  FilePlus,
  FolderPlus,
  LocateFixed,
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/tooltip';
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
import { ALLOW_FILE_EXTENSIONS } from '@/const';
import useApp from '@/hooks/use-app';
import { useIsTouch } from '@/hooks/use-is-touch';
import useSmartFolderEntitlements from '@/hooks/use-smart-folder-entitlements';
import { http } from '@/lib/request';
import { cn } from '@/lib/utils';
import MoveTo from '@/page/resource/actions/move';
import { ISidebarProps } from '@/page/sidebar/interface';

import { CreateFolderDialog } from './create-folder-dialog';
import { CreateSmartFolderDialog } from './create-smart-folder-dialog';
import {
  getSmartFolderChildSidebarKey,
  getSmartFolderSourceParentId,
  getSmartFolderSourceResourceId,
} from './smart-folder-resource-utils';
import { SmartFolderTrashConfirmDialog } from './smart-folder-trash-confirm-dialog';
import {
  CreateSmartFolderPayload,
  SmartFolderResponse,
} from './smart-folder-types';
import { menuIconClass, menuItemClass } from './styles';

function findResourceById(
  resource: ISidebarProps['data'] | undefined,
  resourceId: string
): ISidebarProps['data'] | undefined {
  if (!resource) {
    return undefined;
  }

  if (resource.id === resourceId) {
    return resource;
  }

  for (const child of resource.children || []) {
    const result = findResourceById(child, resourceId);
    if (result) {
      return result;
    }
  }

  return undefined;
}

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
    spaceRoot,
  } = props;
  const app = useApp();
  const { t } = useTranslation();
  const isTouch = useIsTouch();
  const { data: entitlements } = useSmartFolderEntitlements({ namespaceId });
  const [moveTo, setMoveTo] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [editSmartFolderOpen, setEditSmartFolderOpen] = useState(false);
  const [trashSmartFolderConfirmOpen, setTrashSmartFolderConfirmOpen] =
    useState(false);
  const [smartFolderInitial, setSmartFolderInitial] =
    useState<CreateSmartFolderPayload | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreateFile = () => {
    onCreate(spaceType, data.id, 'doc');
  };
  const handleCreateFolder = () => {
    setCreateFolderOpen(true);
  };
  const handleConfirmCreateFolder = (folderName: string) => {
    return onCreate(spaceType, data.id, 'folder', folderName);
  };
  const isSmartFolder = data.resource_type === 'smart_folder';
  const isSmartFolderChild = data.attrs?.__smart_folder_child === true;
  const siblingResources =
    findResourceById(spaceRoot, data.parent_id)?.children || [];
  const canEditSmartFolder =
    (data.current_permission || 'full_access') === 'can_edit' ||
    (data.current_permission || 'full_access') === 'full_access';
  const handleLocateSource = () => {
    const sourceResourceId = getSmartFolderSourceResourceId(data);
    const sourceParentId = getSmartFolderSourceParentId(data);
    if (!sourceResourceId) {
      return;
    }
    app.fire('scroll_to_resource', sourceResourceId, sourceParentId);
    setMenuOpen(false);
  };
  const handleEdit = () => {
    const sourceResourceId = getSmartFolderSourceResourceId(data);
    const sourceParentId = getSmartFolderSourceParentId(data) || data.parent_id;

    onActiveKey(
      sourceResourceId,
      true,
      isSmartFolderChild
        ? getSmartFolderChildSidebarKey(sourceParentId, sourceResourceId)
        : undefined
    );
  };
  const handleEditSmartFolder = () => {
    if (!canEditSmartFolder) {
      return;
    }
    http
      .get(`/namespaces/${namespaceId}/smart-folders/${data.id}/config`)
      .then((response: SmartFolderResponse) => {
        setSmartFolderInitial({
          name: response.resource.name || '',
          matchMode: response.matchMode || response.match_mode || 'all',
          conditions: response.conditions || [],
        });
        setEditSmartFolderOpen(true);
      });
  };
  const handleUpdateSmartFolder = (payload: CreateSmartFolderPayload) => {
    return http
      .patch(
        `/namespaces/${namespaceId}/smart-folders/${data.id}/config`,
        payload
      )
      .then((response: SmartFolderResponse) => {
        app.fire('update_resource', response.resource);
        app.fire('refresh_smart_folder_children', data.id);
        onActiveKey(data.id);
      });
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
    const contextResource = isSmartFolderChild
      ? {
          ...data,
          id: getSmartFolderSourceResourceId(data),
          parent_id: getSmartFolderSourceParentId(data) || data.parent_id,
        }
      : data;
    const fireEvent = () => app.fire('context', contextResource, type);
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
    if (isSmartFolder) {
      setTrashSmartFolderConfirmOpen(true);
      return;
    }

    onDelete(spaceType, data.id, data.parent_id);
  };
  const handleConfirmDeleteSmartFolder = () => {
    setTrashSmartFolderConfirmOpen(false);
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
          {isSmartFolderChild ? (
            <>
              <DropdownMenuItem
                className={menuItemClass}
                onClick={handleLocateSource}
              >
                <LocateFixed className={menuIconClass} />
                {t('actions.locate_source_resource')}
              </DropdownMenuItem>
              <DropdownMenuItem
                className={menuItemClass}
                onSelect={handleRename}
              >
                <SquarePen className={menuIconClass} />
                {t('actions.rename')}
              </DropdownMenuItem>
              <DropdownMenuItem className={menuItemClass} onClick={handleEdit}>
                <Pencil className={menuIconClass} />
                {t('edit')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className={menuItemClass}
                onClick={handleAddToChat}
              >
                <MessageSquareQuote className={menuIconClass} />
                {t('actions.add_it_to_context')}
              </DropdownMenuItem>
            </>
          ) : (
            <>
              {!isSmartFolder && !isSmartFolderChild && (
                <>
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
                  <DropdownMenuItem
                    className={menuItemClass}
                    onClick={handleSelect}
                  >
                    <MonitorUp className={menuIconClass} />
                    {t('actions.upload_file')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem
                className={menuItemClass}
                onSelect={handleRename}
              >
                <SquarePen className={menuIconClass} />
                {t('actions.rename')}
              </DropdownMenuItem>
              {isSmartFolder && canEditSmartFolder ? (
                <DropdownMenuItem
                  className={menuItemClass}
                  onClick={handleEditSmartFolder}
                >
                  <Pencil className={menuIconClass} />
                  {t('actions.edit_smart_folder_conditions')}
                </DropdownMenuItem>
              ) : !isSmartFolder ? (
                <>
                  <DropdownMenuItem
                    className={menuItemClass}
                    onClick={handleEdit}
                  >
                    <Pencil className={menuIconClass} />
                    {t('edit')}
                  </DropdownMenuItem>
                  {!isSmartFolderChild && (
                    <DropdownMenuItem
                      className={menuItemClass}
                      onClick={handleMoveTo}
                    >
                      <Move className={menuIconClass} />
                      {t('actions.move_to')}
                    </DropdownMenuItem>
                  )}
                </>
              ) : null}
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
            </>
          )}
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
      <CreateSmartFolderDialog
        open={editSmartFolderOpen}
        currentResourceId={data.id}
        initialValue={smartFolderInitial}
        siblingResources={siblingResources}
        title={t('smart_folder.edit.title')}
        confirmText={t('smart_folder.edit.submit')}
        onOpenChange={setEditSmartFolderOpen}
        onConfirm={handleUpdateSmartFolder}
      />
      <SmartFolderTrashConfirmDialog
        open={trashSmartFolderConfirmOpen}
        retentionDays={entitlements?.trashRetentionDays}
        smartFolderName={data.name}
        onOpenChange={setTrashSmartFolderConfirmOpen}
        onConfirm={handleConfirmDeleteSmartFolder}
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
