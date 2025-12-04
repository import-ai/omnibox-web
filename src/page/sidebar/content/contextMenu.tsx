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
import { useEffect, useRef, useState } from 'react';
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
    onRename,
    spaceType,
    onActiveKey,
    namespaceId,
  } = props;
  const app = useApp();
  const { t } = useTranslation();
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
      <ContextMenu>
        <ContextMenuTrigger>{children}</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem
            className="cursor-pointer gap-2 text-popover-foreground"
            onClick={handleCreateFile}
          >
            <FilePlus className="size-4 text-neutral-500" />
            {t('actions.create_file')}
          </ContextMenuItem>
          <ContextMenuItem
            className="cursor-pointer gap-2 text-popover-foreground"
            onClick={handleCreateFolder}
          >
            <FolderPlus className="size-4 text-neutral-500" />
            {t('actions.create_folder')}
          </ContextMenuItem>
          <ContextMenuItem
            className="cursor-pointer gap-2 text-popover-foreground"
            onClick={handleSelect}
          >
            <MonitorUp className="size-4 text-neutral-500" />
            {t('actions.upload_file')}
          </ContextMenuItem>
          <ContextMenuSeparator />
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
            <ContextMenuItem
              className="cursor-pointer gap-2 text-popover-foreground"
              onClick={handleRename}
            >
              <Pencil className="size-4 text-neutral-500" />
              {t('actions.rename')}
            </ContextMenuItem>
          )}
          <ContextMenuItem
            className="cursor-pointer gap-2 text-popover-foreground"
            onClick={handleEdit}
          >
            <SquarePen className="size-4 text-neutral-500" />
            {t('edit')}
          </ContextMenuItem>
          <ContextMenuItem
            className="cursor-pointer gap-2 text-popover-foreground"
            onClick={handleMoveTo}
          >
            <Move className="size-4 text-neutral-500" />
            {t('actions.move_to')}
          </ContextMenuItem>
          <ContextMenuSeparator />
          {data.has_children && (
            <ContextMenuItem
              className="cursor-pointer gap-2 text-popover-foreground"
              onClick={handleAddAllToChat}
            >
              <MessageSquarePlus className="size-4 text-neutral-500" />
              {t('actions.add_all_to_context')}
            </ContextMenuItem>
          )}
          <ContextMenuItem
            className="cursor-pointer gap-2 text-popover-foreground"
            onClick={handleAddToChat}
          >
            <MessageSquareQuote className="size-4 text-neutral-500" />
            {data.has_children
              ? t('actions.add_it_only_to_context')
              : t('actions.add_it_to_context')}
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            className="cursor-pointer gap-2 text-destructive"
            onClick={handleDelete}
          >
            <Trash2 className="size-4" />
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
