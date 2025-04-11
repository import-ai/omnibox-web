import * as React from 'react';
import axios from 'axios';
import {
  ChevronRight,
  Command,
  File,
  Folder,
  MoreHorizontal,
  Sparkles,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarRail,
} from '@/components/ui/sidebar';
import type { Resource, ResourceType } from '@/types/resource';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useResource } from '@/components/provider/resource-provider';
import { NamespaceSwitcher } from '@/components/sidebar/namespace-switcher';
import { NavMain } from '@/components/sidebar/nav-main';
import {
  type ResourceConditionType,
  useGlobalContext,
} from '@/components/provider/global-context-provider';

const baseUrl = '/api/v1/resources';
const spaceTypes = ['private', 'teamspace'];

export function MainSidebar() {
  const [rootResourceId, setRootResourceId] = React.useState<
    Record<string, string>
  >({});
  const [isExpanded, setIsExpanded] = React.useState<Record<string, boolean>>(
    {}
  ); // key: resourceId
  const { child, setChild } = useGlobalContext().resourceTreeViewState;
  const { namespace } = useParams();
  const { resource } = useResource();
  const navigate = useNavigate();

  if (!namespace) {
    throw new Error('namespace is required');
  }

  const fetchResource = (rid: string) => {
    axios
      .get(`${baseUrl}/${rid}`)
      .then((response) => {
        const res: Resource = response.data;
        const parentId: string | undefined = res.parentId;
        if (parentId) {
          setChild((prev) => ({
            ...prev,
            [parentId]: prev[parentId].map((r) => (r.id === rid ? res : r)),
          }));
        }
      })
      .catch((error) => {
        console.error({ error });
        throw error;
      });
  };

  const createResource = (
    namespace: string,
    spaceType: string,
    parentId: string,
    resourceType: ResourceType
  ) => {
    axios
      .post(baseUrl, { namespace, spaceType, parentId, resourceType })
      .then((response) => {
        const createdResource: Resource = response.data;
        expandToRoot(createdResource);

        // Update parent's child
        updateChild(parentId, [...(child[parentId] ?? []), createdResource]);
        // Update parent's childCount
        fetchResource(parentId);

        if (resourceType === 'file') {
          navigate(`${createdResource.id}/edit`);
        }
      })
      .catch((error) => {
        console.error({ error });
        throw error;
      });
  };

  const deleteChild = (r: Resource) => {
    if (r.id in child) {
      for (const c of child[r.id]) {
        if (resource?.id === c.id) {
          navigate('.');
        }
        deleteChild(c);
      }
    }
  };

  const deleteResource = (r: Resource) => {
    axios
      .delete(`${baseUrl}/${r.id}`)
      .then((response) => {
        if (r.id === response.data.id) {
          if (r.parentId in child) {
            updateChild(
              r.parentId,
              child[r.parentId].filter((resource) => resource.id !== r.id)
            );
          }
          fetchResource(r.parentId);
          if (resource?.id === r.id) {
            navigate('.');
          }
          deleteChild(r);
        }
      })
      .catch((error) => {
        console.error({ error });
        throw error;
      });
  };

  const updateChild = (resourceId: string, resources: Resource[]) => {
    setChild((prev) => ({ ...prev, [resourceId]: resources }));
    if (!(resourceId in isExpanded)) {
      setIsExpanded((prev) => ({ ...prev, [resourceId]: false }));
    }
  };

  const expandToRoot = (resource: Resource) => {
    if (
      resource.parentId != rootResourceId[resource.spaceType] &&
      !isExpanded[resource.parentId]
    ) {
      fetchChild(namespace, resource.spaceType, resource.parentId).then(() => {
        setIsExpanded((prev) => ({ ...prev, [resource.parentId]: true }));
        axios.get(`${baseUrl}/${resource.parentId}`).then((response) => {
          expandToRoot(response.data);
        });
      });
    }
  };

  React.useEffect(() => {
    if (resource) {
      expandToRoot(resource);
    }
  }, [resource]);

  React.useEffect(() => {
    for (const spaceType of spaceTypes) {
      axios
        .get(`${baseUrl}/root`, { params: { namespace, spaceType } })
        .then((response) => {
          const rootResource: Resource = response.data;
          setRootResourceId((prev) => ({
            ...prev,
            [spaceType]: rootResource.id,
          }));
          axios
            .get(baseUrl, { params: { namespace, spaceType } })
            .then((response) => {
              const resources: Resource[] = response.data;
              if (resources.length > 0) {
                updateChild(rootResource.id, resources);
              }
            });
        });
    }

    return () => {
      for (const setter of [setRootResourceId, setIsExpanded, setChild]) {
        setter({});
      }
    };
  }, [namespace]);

  const expandToggle = (resourceId: string) => {
    setIsExpanded((prev) => ({ ...prev, [resourceId]: !prev[resourceId] }));
  };

  const fetchChild = async (
    namespace: string,
    spaceType: string,
    parentId: string,
    cache = true
  ) => {
    if (!(parentId in child && cache)) {
      axios
        .get(baseUrl, { params: { namespace, spaceType, parentId } })
        .then((response) => {
          const childData: Resource[] = response.data;
          setChild((prev) => ({
            ...prev,
            [parentId]: childData,
          }));
        });
    }
  };

  function ResourceDropdownMenu({ res }: { res: Resource }) {
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

  function Tree({
    namespace,
    spaceType,
    res,
  }: {
    namespace: string;
    spaceType: string;
    res: Resource;
  }) {
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
                <ResourceDropdownMenu res={res} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                {(child[res.id] ?? []).length > 0 &&
                  child[res.id].map((r: Resource) => (
                    <Tree
                      key={r.id}
                      res={r}
                      namespace={namespace}
                      spaceType={spaceType}
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
        <ResourceDropdownMenu res={res} />
      </SidebarMenuItem>
    );
  }

  function Space({
    spaceType,
    namespace,
  }: {
    spaceType: string;
    namespace: string;
  }) {
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
                  createResource(
                    namespace,
                    spaceType,
                    rootResourceId[spaceType],
                    'file'
                  )
                }
              >
                Create File
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  createResource(
                    namespace,
                    spaceType,
                    rootResourceId[spaceType],
                    'folder'
                  )
                }
              >
                Create Folder
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <SidebarGroupContent>
          <SidebarMenu>
            {(child[rootResourceId[spaceType]] ?? []).map((r) => (
              <Tree
                key={r.id}
                res={r}
                namespace={namespace}
                spaceType={spaceType}
              />
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <NamespaceSwitcher namespaces={[{ name: 'test', logo: Command }]} />
        <NavMain items={[{ title: 'Chat', url: './', icon: Sparkles }]} />
      </SidebarHeader>
      <SidebarContent>
        {spaceTypes.map((spaceType: string, index: number) => (
          <Space key={index} spaceType={spaceType} namespace={namespace} />
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
