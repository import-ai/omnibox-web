import useApp from '@/hooks/use-app';
import { MoreHorizontal } from 'lucide-react';
import { SidebarMenuAction } from '@/components/ui/sidebar';
import { SpaceType, ResourceType } from '@/interface';
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
  expands: Array<string>;
  onActiveKey: (id: string) => void;
  onDelete: (id: string, spaceType: SpaceType) => void;
  onExpand: (id: string, spaceType: SpaceType) => void;
  onCreate: (
    namespace: string,
    spaceType: string,
    parentId: string,
    resourceType: ResourceType
  ) => void;
}

export default function MainDropdownMenu(props: IResourceProps) {
  const { data, namespace, onActiveKey, onCreate, onDelete } = props;
  const app = useApp();
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
    app.fire('resource_wrapper', true);
    app.fire('context', data, 'resource');
  };
  const handleAddAllToChat = () => {
    app.fire('resource_wrapper', true);
    app.fire('context', data, 'parent');
  };
  const handleDelete = () => {
    onDelete(data.id, data.spaceType);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuAction className="right-0">
          <MoreHorizontal />
        </SidebarMenuAction>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="start" sideOffset={10}>
        <DropdownMenuItem className="cursor-pointer" onClick={handleCreateFile}>
          Create File
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={handleCreateFolder}
        >
          Create Folder
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" onClick={handleEdit}>
          Edit
        </DropdownMenuItem>
        {hasChildren && (
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={handleAddAllToChat}
          >
            Add all to Context
          </DropdownMenuItem>
        )}
        <DropdownMenuItem className="cursor-pointer" onClick={handleAddToChat}>
          Add it to Context
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" onClick={handleDelete}>
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
