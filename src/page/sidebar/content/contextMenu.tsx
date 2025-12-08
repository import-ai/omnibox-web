import {
  FilePlus,
  FolderPlus,
  MessageSquarePlus,
  MessageSquareQuote,
  MonitorUp,
  Move,
  Pencil,
  SquarePen,
  Trash2,
} from 'lucide-react';
import { useRef, useState } from 'react';
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
import MoveTo from '@/page/resource/actions/move';
import { ISidebarProps } from '@/page/sidebar/interface';

import { menuIconClass, menuItemClass, menuItemGroupClass } from './styles';

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
  } = props;
  const app = useApp();
  const { t } = useTranslation();
  const [moveTo, setMoveTo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    // Delay to ensure context menu is fully closed before triggering rename
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
      <ContextMenu>
        <ContextMenuTrigger>{children}</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem className={menuItemClass} onClick={handleCreateFile}>
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
          <ContextMenuItem className={menuItemClass} onClick={handleSelect}>
            <MonitorUp className={menuIconClass} />
            {t('actions.upload_file')}
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem className={menuItemClass} onClick={handleRename}>
            <SquarePen className={menuIconClass} />
            {t('actions.rename')}
          </ContextMenuItem>
          <ContextMenuItem className={menuItemClass} onClick={handleEdit}>
            <Pencil className={menuIconClass} />
            {t('edit')}
          </ContextMenuItem>
          <ContextMenuItem className={menuItemClass} onClick={handleMoveTo}>
            <Move className={menuIconClass} />
            {t('actions.move_to')}
          </ContextMenuItem>
          <ContextMenuSeparator />
          {data.resource_type === 'folder' ? (
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
            className={menuItemGroupClass}
            onClick={handleDelete}
          >
            <Trash2 className={menuIconClass} />
            {t('move-delete')}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
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
