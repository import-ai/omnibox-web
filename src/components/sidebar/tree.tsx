import { Link } from 'react-router-dom';
import type { Resource } from '@/types/resource';
import { ChevronRight, File, Folder } from 'lucide-react';
import ResourceDropdownMenu, {
  IResourceProps,
} from '@/components/sidebar/resource-dropdown-menu';
import {
  SidebarMenuSub,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface IProps extends IResourceProps {
  isExpanded: Record<string, boolean>;
  data: Array<Resource>;
  namespace: string;
  spaceType: string;
  resource?: Resource;
  fetchChild: (
    namespace: string,
    spaceType: string,
    parentId: string,
    cache?: boolean
  ) => Promise<void>;
  expandToggle: (resourceId: string) => void;
}

export default function Tree(props: IProps) {
  const {
    res,
    data,
    resource,
    spaceType,
    namespace,
    fetchChild,
    isExpanded,
    expandToggle,
    createResource,
    deleteResource,
  } = props;

  if (res.childCount > 0) {
    return (
      <SidebarMenuItem>
        <Collapsible
          className="group/collapsible [&[data-state=open]>div>a>svg:first-child]:rotate-90"
          open={isExpanded[res.id]}
        >
          <CollapsibleTrigger asChild>
            <div>
              <SidebarMenuButton asChild isActive={res.id == resource?.id}>
                <Link to={res.id}>
                  <ChevronRight
                    className="transition-transform"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      fetchChild(namespace, spaceType, res.id).then(() =>
                        expandToggle(res.id)
                      );
                    }}
                  />
                  {res.resourceType === 'folder' ? <Folder /> : <File />}
                  <span className="truncate">{res.name ?? 'Untitled'}</span>
                </Link>
              </SidebarMenuButton>
              <ResourceDropdownMenu
                res={res}
                namespace={namespace}
                createResource={createResource}
                deleteResource={deleteResource}
              />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              {data.map((r) => (
                <Tree
                  key={r.id}
                  res={r}
                  data={data}
                  namespace={namespace}
                  spaceType={spaceType}
                  createResource={createResource}
                  deleteResource={deleteResource}
                  resource={resource}
                  isExpanded={isExpanded}
                  fetchChild={fetchChild}
                  expandToggle={expandToggle}
                />
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </Collapsible>
      </SidebarMenuItem>
    );
  }
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        className="data-[active=true]:bg-transparent"
        isActive={res.id == resource?.id}
        asChild
      >
        <Link to={res.id}>
          <File />
          <span className="truncate">{res.name ?? 'Untitled'}</span>
        </Link>
      </SidebarMenuButton>
      <ResourceDropdownMenu
        res={res}
        namespace={namespace}
        createResource={createResource}
        deleteResource={deleteResource}
      />
    </SidebarMenuItem>
  );
}
