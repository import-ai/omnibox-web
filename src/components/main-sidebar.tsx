import * as React from "react"
import axios from "axios";
import {ChevronRight, File, Folder, MoreHorizontal} from "lucide-react"
import {Link} from "react-router";

import {Collapsible, CollapsibleContent, CollapsibleTrigger,} from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu, SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarRail,
} from "@/components/ui/sidebar"
import {Resource} from "@/types/resource"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";


const baseUrl = "/api/v1/resources"
const spaceTypes = ["private", "teamspace"]

export function MainSidebar({payload}: { payload: { namespace: string, resource?: Resource } }) {
  const [rootResourceId, setRootResourceId] = React.useState<Record<string, string>>({});
  const [isExpanded, setIsExpanded] = React.useState<Record<string, boolean>>({});  // key: resourceId
  const [child, setChild] = React.useState<Record<string, Resource[]>>({});  // resourceId -> Resource[]

  const updateChild = (resourceId: string, resources: Resource[]) => {
    setChild((prev) => ({...prev, [resourceId]: resources}));
    if (!(resourceId in isExpanded)) {
      setIsExpanded((prev) => ({...prev, [resourceId]: false}));
    }
  };

  const expandToRoot = (resource: Resource) => {
    if (resource.parentId != rootResourceId[resource.spaceType] && !isExpanded[resource.parentId]) {
      fetchChild(payload.namespace, resource.spaceType, resource.parentId).then(() => {
        setIsExpanded((prev) => ({...prev, [resource.parentId]: true}));
        axios.get(`${baseUrl}/${resource.parentId}`).then((response) => {
          expandToRoot(response.data);
        })
      })
    }
  }

  React.useEffect(() => {
    if (payload.resource) {
      expandToRoot(payload.resource);
    }
  }, [payload.resource?.parentId])

  React.useEffect(() => {
    for (const spaceType of spaceTypes) {
      axios.get(baseUrl, {params: {namespace: payload.namespace, spaceType}}).then(response => {
        const resources: Resource[] = response.data;
        if (resources.length > 0) {
          const parentId = resources[0].parentId;
          updateChild(parentId, resources);
          setRootResourceId((prev) => ({...prev, [spaceType]: parentId}));
        }
      })
    }

    return () => {
      for (const setter of [setRootResourceId, setIsExpanded, setChild]) {
        setter({});
      }
    }
  }, [payload.namespace]);

  const expandToggle = (resourceId: string) => {
    setIsExpanded((prev) => ({...prev, [resourceId]: !prev[resourceId]}));
  }

  const fetchChild = async (namespace: string, spaceType: string, parentId: string) => {
    if (!(parentId in child)) {
      axios.get(baseUrl, {params: {namespace, spaceType, parentId}}).then(response => {
        const childData: Resource[] = response.data;
        setChild((prev) => ({
          ...prev,
          [parentId]: childData,
        }));
      })
    }
  }


  function Tree({namespace, spaceType, resource}: { namespace: string, spaceType: string, resource: Resource }) {
    if (resource.childCount > 0) {
      return (
        <SidebarMenuItem>
          <Collapsible
            className="group/collapsible [&[data-state=open]>div>a>svg:first-child]:rotate-90"
            open={isExpanded[resource.id]}
          >
            <CollapsibleTrigger asChild>
              <div>
                <SidebarMenuButton
                  asChild
                  isActive={resource.id == payload.resource?.id}
                >
                  <Link to={`/${payload.namespace}/${resource.id}`}>
                    <ChevronRight className="transition-transform" onClick={
                      (event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        fetchChild(namespace, spaceType, resource.id).then(() => expandToggle(resource.id));
                      }
                    }/>
                    {resource.resourceType === "folder" ? <Folder/> : <File/>}
                    {resource.name}
                  </Link>
                </SidebarMenuButton>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuAction>
                      <MoreHorizontal/>
                    </SidebarMenuAction>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="right" align="start">
                    <DropdownMenuItem>
                      Foo
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      Bar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub>
                {(child[resource.id] ?? []).length > 0 &&
                  child[resource.id].map((resource: Resource) => (
                    <Tree key={resource.id} resource={resource} namespace={namespace} spaceType={spaceType}/>
                  ))
                }
              </SidebarMenuSub>
            </CollapsibleContent>
          </Collapsible>
        </SidebarMenuItem>
      )
    }
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          className="data-[active=true]:bg-transparent"
          isActive={resource.id == payload.resource?.id}
          asChild
        >
          <Link to={`/${payload.namespace}/${resource.id}`}>
            <File/>
            {resource.name}
          </Link>
        </SidebarMenuButton>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuAction>
              <MoreHorizontal/>
            </SidebarMenuAction>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start">
            <DropdownMenuItem>
              Foo
            </DropdownMenuItem>
            <DropdownMenuItem>
              Bar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    )
  }

  function Space({spaceType, namespace}: { spaceType: string, namespace: string }) {
    const spaceTitle = `${spaceType.charAt(0).toUpperCase()}${spaceType.slice(1)}`
    return (
      <SidebarGroup>
        <SidebarGroupLabel>{spaceTitle}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {(child[rootResourceId[spaceType]] ?? []).map((resource) => (
              <Tree key={resource.id} resource={resource} namespace={namespace} spaceType={spaceType}/>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    )
  }

  return (
    <Sidebar>
      <SidebarContent>
        {spaceTypes.map((spaceType: string, index: number) => (
          <Space key={index} spaceType={spaceType} namespace={payload.namespace}/>
        ))}
      </SidebarContent>
      <SidebarRail/>
    </Sidebar>
  )
}


