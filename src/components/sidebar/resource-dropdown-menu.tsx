import { MoreHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SidebarMenuAction } from '@/components/ui/sidebar';
import type { Resource, ResourceType } from '@/types/resource';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  type ResourceConditionType,
  useGlobalContext,
} from '@/components/provider/global-context-provider';

export interface IResourceProps {
  res: Resource;
  namespace: string;
  createResource: (
    namespace: string,
    spaceType: string,
    parentId: string,
    resourceType: ResourceType
  ) => void;
  deleteResource: (res: Resource) => void;
}

export default function ResourceDropdownMenu(props: IResourceProps) {
  const { res, namespace, createResource, deleteResource } = props;
  const globalContext = useGlobalContext();
  const { resourcesCondition, setResourcesCondition } =
    globalContext.resourcesConditionState;
  const navigate = useNavigate();
  const addToChatContext = (r: Resource, type: ResourceConditionType) => {
    if (
      !resourcesCondition.some(
        (rc) => rc.resource.id === r.id && rc.type === type
      )
    ) {
      setResourcesCondition((prev) => [...prev, { resource: r, type }]);
    }
    navigate('./');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuAction>
          <MoreHorizontal />
        </SidebarMenuAction>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="start">
        <DropdownMenuItem
          onClick={() =>
            createResource(namespace ?? '', res.spaceType, res.id, 'file')
          }
        >
          Create File
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            createResource(namespace ?? '', res.spaceType, res.id, 'folder')
          }
        >
          Create Folder
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate(`${res.id}/edit`)}>
          Edit
        </DropdownMenuItem>
        {res.childCount > 0 && (
          <DropdownMenuItem onClick={() => addToChatContext(res, 'parent')}>
            Add all to Context
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => addToChatContext(res, 'resource')}>
          Add it to Context
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => deleteResource(res)}>
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
