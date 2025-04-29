import useApp from '@/hooks/use-app';
import { useTranslation } from 'react-i18next';
import { SpaceType, ResourceType } from '@/interface';
import { MoreHorizontal, LoaderCircle } from 'lucide-react';
import { SidebarMenuAction } from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface IResourceProps {
  data: any;
  namespace: string;
  spaceType: string;
  activeKey: string;
  expanding: string;
  editingKey: string;
  expands: Array<string>;
  onActiveKey: (id: string) => void;
  onDelete: (id: string, spaceType: SpaceType) => void;
  onExpand: (id: string, spaceType: SpaceType) => void;
  onCreate: (
    namespace: string,
    spaceType: string,
    parentId: string,
    resourceType: ResourceType,
  ) => void;
}

export default function MainDropdownMenu(props: IResourceProps) {
  const {
    data,
    namespace,
    activeKey,
    editingKey,
    onActiveKey,
    onCreate,
    onDelete,
  } = props;
  const app = useApp();
  const { t } = useTranslation();
  const hasChildren = data.childCount > 0;
  const handleCreateFile = () => {
    onCreate(namespace, data.spaceType, data.id, 'file');
  };
  const handleCreateFolder = () => {
    onCreate(namespace, data.spaceType, data.id, 'folder');
  };
  const handleEdit = () => {
    onActiveKey(data.id);
    setTimeout(() => {
      app.fire('to_edit');
    }, 100);
  };
  const handleAddToChat = () => {
    if (activeKey !== 'chat') {
      onActiveKey('chat');
    }
    app.fire('context', data, 'resource');
  };
  const handleAddAllToChat = () => {
    if (activeKey !== 'chat') {
      onActiveKey('chat');
    }
    app.fire('context', data, 'parent');
  };
  const handleDelete = () => {
    onDelete(data.id, data.spaceType);
  };

  return (
    <DropdownMenu>
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
        <DropdownMenuItem className="cursor-pointer" onClick={handleCreateFile}>
          {t('create_file')}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={handleCreateFolder}
        >
          {t('create_folder')}
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" onClick={handleEdit}>
          {t('edit')}
        </DropdownMenuItem>
        {hasChildren && (
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={handleAddAllToChat}
          >
            {t('add_all_to_context')}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem className="cursor-pointer" onClick={handleAddToChat}>
          {t('add_it_to_context')}
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" onClick={handleDelete}>
          {t('delete')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
