import { useRef } from 'react';
import useApp from '@/hooks/use-app';
import { Input } from '@/components/ui/input';
import { ALLOW_FILE_EXTENSIONS } from '@/const';
import { useTranslation } from 'react-i18next';
import { MoreHorizontal, LoaderCircle } from 'lucide-react';
import { SidebarMenuAction } from '@/components/ui/sidebar';
import { SpaceType, ResourceType, Resource } from '@/interface';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface IResourceProps {
  data: any;
  namespace_id: string;
  space_type: string;
  activeKey: string;
  expanding: string;
  editingKey: string;
  expands: Array<string>;
  onActiveKey: (id: string) => void;
  onUpload: (
    namespace_id: string,
    space_type: string,
    parent_id: string,
    file: File,
  ) => Promise<void>;
  onExpand: (id: string, space_type: SpaceType) => void;
  onMenuMore: (id: string, space_type: SpaceType) => void;
  onDelete: (id: string, space_type: SpaceType, parent_id: string) => void;
  onCreate: (
    namespace_id: string,
    space_type: string,
    parent_id: string,
    resource_type: ResourceType,
  ) => void;
}

export default function MainDropdownMenu(props: IResourceProps) {
  const {
    data,
    onUpload,
    onCreate,
    onDelete,
    onMenuMore,
    editingKey,
    onActiveKey,
    namespace_id,
  } = props;
  const app = useApp();
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const children = Array.isArray(data.children)
    ? data.children.filter((item: Resource) => item.id !== 'empty')
    : [];
  const handleCreateFile = () => {
    onCreate(namespace_id, data.space_type, data.id, 'doc');
  };
  const handleCreateFolder = () => {
    onCreate(namespace_id, data.space_type, data.id, 'folder');
  };
  const handleEdit = () => {
    onActiveKey(data.id);
    setTimeout(() => {
      app.fire('to_edit');
    }, 100);
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
    onUpload(namespace_id, data.space_type, data.id, e.target.files[0]).finally(
      () => {
        fileInputRef.current!.value = '';
      },
    );
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
          <DropdownMenuItem className="cursor-pointer" onClick={handleDelete}>
            {t('delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={handleUpload}
        accept={ALLOW_FILE_EXTENSIONS}
      />
    </>
  );
}
