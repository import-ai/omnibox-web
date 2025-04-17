import Tree from './tree';
import { IResourceProps } from './dropdown';
import { MoreHorizontal } from 'lucide-react';
import {
  SidebarMenu,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenuAction,
  SidebarGroupContent,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from '@/components/ui/dropdown-menu';

interface IProps extends IResourceProps {}

export default function Space(props: IProps) {
  const { data, spaceType, namespace, onCreate } = props;
  const hasChildren = data.childCount > 0;

  return (
    <SidebarGroup>
      <div className="flex items-center justify-between">
        <SidebarGroupLabel>{`${spaceType
          .charAt(0)
          .toUpperCase()}${spaceType.slice(1)}`}</SidebarGroupLabel>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuAction className="my-1.5 right-2">
              <MoreHorizontal />
            </SidebarMenuAction>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" sideOffset={10} align="start">
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => {
                onCreate(namespace, spaceType, data.id, 'file');
              }}
            >
              Create File
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => {
                onCreate(namespace, spaceType, data.id, 'folder');
              }}
            >
              Create Folder
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <SidebarGroupContent>
        <SidebarMenu>
          {hasChildren &&
            Array.isArray(data.children) &&
            data.children.length > 0 &&
            data.children.map((item) => (
              <Tree {...props} data={item} key={item.id} />
            ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
