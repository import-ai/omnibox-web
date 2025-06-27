import useApp from '@/hooks/use-app';
import { Resource } from '@/interface';
import { useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';
import { ALLOW_FILE_EXTENSIONS } from '@/const';
import MoveTo from '@/page/resource/actions/move';
import { ISidebarProps } from '@/page/sidebar/interface';
import { MoreHorizontal, LoaderCircle } from 'lucide-react';
import { SidebarMenuAction } from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Action(props: ISidebarProps) {
  const {
    data,
    onUpload,
    onCreate,
    onDelete,
    onMenuMore,
    editingKey,
    onActiveKey,
    namespaceId,
  } = props;
  const app = useApp();
  const { t } = useTranslation();
  const [moveTo, setMoveTo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const children = Array.isArray(data.children)
    ? data.children.filter((item: Resource) => item.id !== 'empty')
    : [];
  const handleCreateFile = () => {
    onCreate(data.space_type, data.id, 'doc');
  };
  const handleCreateFolder = () => {
    onCreate(data.space_type, data.id, 'folder');
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
    onDelete(data.id, data.space_type, data.parent_id);
  };
  const handleSelect = () => {
    fileInputRef.current?.click();
  };
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) {
      return;
    }
    onUpload(data.space_type, data.id, e.target.files).finally(() => {
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
    onMenuMore(data.id, data.space_type);
  };

  return (
    <>
      <DropdownMenu onOpenChange={handleOpenChange}>
        <DropdownMenuTrigger asChild>
          <SidebarMenuAction className="right-0 focus-visible:outline-none focus-visible:ring-transparent">
            {data.id === editingKey ? (
              <LoaderCircle className="transition-transform animate-spin" />
            ) : (
              <MoreHorizontal className="focus-visible:outline-none focus-visible:ring-transparent" />
            )}
          </SidebarMenuAction>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" sideOffset={10}>
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={handleCreateFile}
          >
            {t('actions.create_file')}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={handleCreateFolder}
          >
            {t('actions.create_folder')}
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer" onClick={handleSelect}>
            {t('actions.upload_file')}
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer" onClick={handleEdit}>
            {t('edit')}
          </DropdownMenuItem>
          {children.length > 0 && (
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={handleAddAllToChat}
            >
              {t('actions.add_all_to_context')}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={handleAddToChat}
          >
            {t('actions.add_it_to_context')}
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer" onClick={handleMoveTo}>
            {t('actions.move_to')}
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer" onClick={handleDelete}>
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
