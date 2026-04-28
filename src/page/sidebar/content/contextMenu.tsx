import {
  FilePlus,
  FolderPlus,
  LocateFixed,
  MessageSquarePlus,
  MessageSquareQuote,
  MonitorUp,
  Move,
  Pencil,
  SquarePen,
  Trash2,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { useDragLayer } from 'react-dnd';
import { useTranslation } from 'react-i18next';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Input } from '@/components/ui/input';
import { ALLOW_FILE_EXTENSIONS } from '@/const';
import useApp from '@/hooks/use-app';
import useSmartFolderEntitlements from '@/hooks/use-smart-folder-entitlements';
import MoveTo from '@/page/resource/actions/move';
import { ISidebarProps } from '@/page/sidebar/interface';

import { CreateSmartFolderDialog } from './create-smart-folder-dialog';
import {
  getSmartFolderSourceParentId,
  getSmartFolderSourceResourceId,
} from './smart-folder-resource-utils';
import { SmartFolderTrashConfirmDialog } from './smart-folder-trash-confirm-dialog';
import { menuIconClass, menuItemClass } from './styles';
import { useSmartFolderResourceActions } from './use-smart-folder-resource-actions';

export interface IProps extends ISidebarProps {
  children: React.ReactNode;
}

export default function ContextMenuMain(props: IProps) {
  const {
    data,
    children,
    onUpload,
    onCreate,
    onDelete,
    spaceType,
    onActiveKey,
    namespaceId,
    spaceRoot,
  } = props;
  const app = useApp();
  const { t } = useTranslation();
  const { data: entitlements } = useSmartFolderEntitlements({ namespaceId });
  const [moveTo, setMoveTo] = useState(false);
  const [, setContextOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const smartFolder = useSmartFolderResourceActions({
    data,
    namespaceId,
    spaceRoot,
    onActiveKey,
    onDelete,
    spaceType,
    closeMenu: () => setContextOpen(false),
  });

  //Check whether to drag from the initial position
  const { isActuallyDragging } = useDragLayer(monitor => {
    const isDragging = monitor.isDragging();
    const diff = monitor.getDifferenceFromInitialOffset();
    const hasMoved = diff
      ? Math.abs(diff.x) > 5 || Math.abs(diff.y) > 5
      : false;
    return {
      isActuallyDragging: isDragging && hasMoved,
    };
  });

  const handleCreateFile = () => {
    onCreate(spaceType, data.id, 'doc');
  };
  const handleCreateFolder = () => {
    onCreate(spaceType, data.id, 'folder');
  };
  const handleRename = () => {
    // Delay to ensure context menu is fully closed before triggering rename
    setTimeout(() => {
      app.fire('start_rename', data.id);
    }, 150);
  };

  const addToContext = (type: 'resource' | 'folder') => {
    const contextResource = smartFolder.isSmartFolderChild
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
      <ContextMenu onOpenChange={setContextOpen}>
        <ContextMenuTrigger disabled={isActuallyDragging}>
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent>
          {smartFolder.isSmartFolderChild ? (
            <>
              <ContextMenuItem
                className={menuItemClass}
                onClick={smartFolder.handleLocateSource}
              >
                <LocateFixed className={menuIconClass} />
                {t('actions.locate_source_resource')}
              </ContextMenuItem>
              <ContextMenuItem className={menuItemClass} onClick={handleRename}>
                <SquarePen className={menuIconClass} />
                {t('actions.rename')}
              </ContextMenuItem>
              <ContextMenuItem
                className={menuItemClass}
                onClick={smartFolder.handleEdit}
              >
                <Pencil className={menuIconClass} />
                {t('edit')}
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem
                className={menuItemClass}
                onClick={handleAddToChat}
              >
                <MessageSquareQuote className={menuIconClass} />
                {t('actions.add_it_to_context')}
              </ContextMenuItem>
            </>
          ) : (
            <>
              {!smartFolder.isSmartFolder &&
                !smartFolder.isSmartFolderChild && (
                  <>
                    <ContextMenuItem
                      className={menuItemClass}
                      onClick={handleCreateFile}
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
                      onClick={handleSelect}
                    >
                      <MonitorUp className={menuIconClass} />
                      {t('actions.upload_file')}
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                  </>
                )}
              <ContextMenuItem className={menuItemClass} onClick={handleRename}>
                <SquarePen className={menuIconClass} />
                {t('actions.rename')}
              </ContextMenuItem>
              {smartFolder.isSmartFolder && smartFolder.canEditSmartFolder ? (
                <ContextMenuItem
                  className={menuItemClass}
                  onClick={smartFolder.handleEditSmartFolder}
                >
                  <Pencil className={menuIconClass} />
                  {t('actions.edit_smart_folder_conditions')}
                </ContextMenuItem>
              ) : !smartFolder.isSmartFolder ? (
                <>
                  <ContextMenuItem
                    className={menuItemClass}
                    onClick={smartFolder.handleEdit}
                  >
                    <Pencil className={menuIconClass} />
                    {t('edit')}
                  </ContextMenuItem>
                  {!smartFolder.isSmartFolderChild && (
                    <ContextMenuItem
                      className={menuItemClass}
                      onClick={handleMoveTo}
                    >
                      <Move className={menuIconClass} />
                      {t('actions.move_to')}
                    </ContextMenuItem>
                  )}
                </>
              ) : null}
              <ContextMenuSeparator />
              {data.resource_type === 'folder' || smartFolder.isSmartFolder ? (
                <ContextMenuItem
                  className={menuItemClass}
                  onClick={handleAddAllToChat}
                >
                  <MessageSquarePlus className={menuIconClass} />
                  {t('actions.add_all_to_context')}
                </ContextMenuItem>
              ) : data.has_children ? (
                <>
                  <ContextMenuItem
                    className={menuItemClass}
                    onClick={handleAddAllToChat}
                  >
                    <MessageSquarePlus className={menuIconClass} />
                    {t('actions.add_all_to_context')}
                  </ContextMenuItem>
                  <ContextMenuItem
                    className={menuItemClass}
                    onClick={handleAddToChat}
                  >
                    <MessageSquareQuote className={menuIconClass} />
                    {t('actions.add_it_to_context')}
                  </ContextMenuItem>
                </>
              ) : (
                <ContextMenuItem
                  className={menuItemClass}
                  onClick={handleAddToChat}
                >
                  <MessageSquareQuote className={menuIconClass} />
                  {t('actions.add_it_to_context')}
                </ContextMenuItem>
              )}
              <ContextMenuSeparator />
              <ContextMenuItem
                className="group cursor-pointer gap-2 data-[highlighted]:text-destructive"
                onClick={smartFolder.handleDelete}
              >
                <Trash2 className="size-4 text-neutral-500 dark:text-[#a1a1a1] group-hover:text-destructive" />
                {t('actions.move_to_trash')}
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>
      <MoveTo
        open={moveTo}
        resourceId={data.id}
        sourceResourceType={data.resource_type}
        onOpenChange={setMoveTo}
        namespaceId={namespaceId}
        onFinished={handleMoveFinished}
      />
      <CreateSmartFolderDialog
        open={smartFolder.editSmartFolderOpen}
        currentResourceId={data.id}
        initialValue={smartFolder.smartFolderInitial}
        siblingResources={smartFolder.siblingResources}
        title={t('smart_folder.edit.title')}
        confirmText={t('smart_folder.edit.submit')}
        onOpenChange={smartFolder.setEditSmartFolderOpen}
        onConfirm={smartFolder.handleUpdateSmartFolder}
      />
      <SmartFolderTrashConfirmDialog
        open={smartFolder.trashSmartFolderConfirmOpen}
        retentionDays={entitlements?.trashRetentionDays}
        smartFolderName={data.name}
        onOpenChange={smartFolder.setTrashSmartFolderConfirmOpen}
        onConfirm={smartFolder.handleConfirmDeleteSmartFolder}
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
