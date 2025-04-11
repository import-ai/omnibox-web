import Tree from '@/components/sidebar/tree';
import { MoreHorizontal } from 'lucide-react';
import type { Resource } from '@/types/resource';
import { IResourceProps } from '@/components/sidebar/resource-dropdown-menu';
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

interface IProps extends Omit<IResourceProps, 'res'> {
  spaceType: string;
  resource?: Resource;
  data: Array<Resource>;
  resourceType: string;
  isExpanded: Record<string, boolean>;
  expandToggle: (resourceId: string) => void;
  fetchChild: (
    namespace: string,
    spaceType: string,
    parentId: string,
    cache?: boolean
  ) => Promise<void>;
}

export default function Space(props: IProps) {
  const {
    data,
    resource,
    spaceType,
    namespace,
    fetchChild,
    isExpanded,
    expandToggle,
    resourceType,
    createResource,
    deleteResource,
  } = props;
  const spaceTitle = `${spaceType.charAt(0).toUpperCase()}${spaceType.slice(
    1
  )}`;

  return (
    <SidebarGroup>
      <div className="flex items-center justify-between">
        <SidebarGroupLabel>{spaceTitle}</SidebarGroupLabel>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuAction className="my-1.5">
              <MoreHorizontal />
            </SidebarMenuAction>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start">
            <DropdownMenuItem
              onClick={() =>
                createResource(namespace, spaceType, resourceType, 'file')
              }
            >
              Create File
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                createResource(namespace, spaceType, resourceType, 'folder')
              }
            >
              Create Folder
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <SidebarGroupContent>
        <SidebarMenu>
          {Array.isArray(data) &&
            data.length > 0 &&
            data.map((r) => (
              <Tree
                key={r.id}
                res={r}
                data={data}
                resource={resource}
                namespace={namespace}
                spaceType={spaceType}
                fetchChild={fetchChild}
                isExpanded={isExpanded}
                expandToggle={expandToggle}
                createResource={createResource}
                deleteResource={deleteResource}
              />
            ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
