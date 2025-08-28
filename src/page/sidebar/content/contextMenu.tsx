import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Input } from '@/components/ui/input';
import { ALLOW_FILE_EXTENSIONS } from '@/const';
import useApp from '@/hooks/use-app';
import MoveTo from '@/page/resource/actions/move';
import { ISidebarProps } from '@/page/sidebar/interface';

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
    onMenuMore,
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
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      return;
    }
    onMenuMore(spaceType, data.id);
  };

  return (
    <>
      <ContextMenu onOpenChange={handleOpenChange}>
        <ContextMenuTrigger>{children}</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem
            className="cursor-pointer"
            onClick={handleCreateFile}
          >
            {t('actions.create_file')}
          </ContextMenuItem>
          <ContextMenuItem
            className="cursor-pointer"
            onClick={handleCreateFolder}
          >
            {t('actions.create_folder')}
          </ContextMenuItem>
          <ContextMenuItem className="cursor-pointer" onClick={handleSelect}>
            {t('actions.upload_file')}
          </ContextMenuItem>
          <ContextMenuItem className="cursor-pointer" onClick={handleEdit}>
            {t('edit')}
          </ContextMenuItem>
          {data.has_children && (
            <ContextMenuItem
              className="cursor-pointer"
              onClick={handleAddAllToChat}
            >
              {t('actions.add_all_to_context')}
            </ContextMenuItem>
          )}
          <ContextMenuItem className="cursor-pointer" onClick={handleAddToChat}>
            {t('actions.add_it_to_context')}
          </ContextMenuItem>
          <ContextMenuItem className="cursor-pointer" onClick={handleMoveTo}>
            {t('actions.move_to')}
          </ContextMenuItem>
          <ContextMenuItem className="cursor-pointer" onClick={handleDelete}>
            {t('delete')}
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
