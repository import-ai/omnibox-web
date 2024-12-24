import * as React from "react"
import axios from "axios";
import {ChevronRight, File, Folder} from "lucide-react"
import {Link} from "react-router";

import {Collapsible, CollapsibleContent, CollapsibleTrigger,} from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarRail,
} from "@/components/ui/sidebar"
import {Resource} from "@/types/resource"


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

  React.useEffect(() => {
    console.log("resourceId", payload.resource?.id);
  }, [payload.resource?.id])

  React.useEffect(() => {
    console.log("namespace", payload.namespace);

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

  const expand = (resourceId: string) => {
    setIsExpanded((prev) => ({
      ...prev,
      [resourceId]: !isExpanded[resourceId]
    }));
  }

  const handleExpand = async (namespace: string, spaceType: string, parentId: string) => {
    if (!(parentId in child)) {
      axios.get(baseUrl, {params: {namespace, spaceType, parentId}}).then(response => {
        const childData: Resource[] = response.data;
        setChild((prev) => ({
          ...prev,
          [parentId]: childData,
        }));
        expand(parentId);
      })
    } else {
      expand(parentId);
    }

  };


  function Tree({namespace, spaceType, resource}: { namespace: string, spaceType: string, resource: Resource }) {
    if (resource.childCount > 0) {
      return (
        <SidebarMenuItem>
          <Collapsible
            className="group/collapsible [&[data-state=open]>button>svg:first-child]:rotate-90"
            open={isExpanded[resource.id]}
          >
            <CollapsibleTrigger asChild>
              <SidebarMenuButton onClick={() => handleExpand(namespace, spaceType, resource.id)}>
                <ChevronRight className="transition-transform"/>
                <Folder/>
                {resource.name}
              </SidebarMenuButton>
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


