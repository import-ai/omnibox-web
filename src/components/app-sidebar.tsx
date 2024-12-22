import * as React from "react"
import {useParams} from "react-router"
import axios from "axios";
import {ChevronRight, File, Folder} from "lucide-react"

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
import {Resource} from "@/types/resources"


const baseUrl = "/api/v1/resources"
const spaceTypes = ["private", "teamspace"]

export function AppSidebar() {
  const [rootResourceId, setRootResourceId] = React.useState<Record<string, string>>({});
  const [isExpanded, setIsExpanded] = React.useState<Record<string, boolean>>({});  // key: resourceId
  const [isActivated, setIsActivated] = React.useState<Record<string, boolean>>({});  // key: resourceId
  const [child, setChild] = React.useState<Record<string, Resource[]>>({});  // resourceId -> Resource[]
  const urlParams = useParams();
  const meta = {
    namespace: urlParams.namespace ?? "",
    resourceId: urlParams.resourceId ?? ""
  }

  const updateChild = (resourceId: string, resources: Resource[]) => {
    setChild((prev) => ({...prev, [resourceId]: resources}));
    if (!(resourceId in isExpanded)) {
      setIsExpanded((prev) => ({...prev, [resourceId]: false}));
    }
    for (const resource of resources) {
      if (!(resource.id in isActivated)) {
        setIsActivated((prev) => ({...prev, [resource.id]: false}))
      }
    }
  };

  React.useEffect(() => {
    for (const setter of [setRootResourceId, setIsExpanded, setIsActivated, setChild]) {
      setter({});
    }

    for (const spaceType of spaceTypes) {
      axios.get(baseUrl, {params: {namespace: meta.namespace, spaceType}}).then(response => {
        const resources: Resource[] = response.data;
        if (resources.length > 0) {
          const parentId = resources[0].parentId;
          updateChild(parentId, resources);
          setRootResourceId((prev) => ({...prev, [spaceType]: parentId}));
        }
      })
    }
  }, [meta.namespace]);

  const handleExpand = async (namespace: string, spaceType: string, parentId: string) => {
    if (!(parentId in child)) {
      axios.get(baseUrl, {params: {namespace, spaceType, parentId}}).then(response => {
        const childData: Resource[] = response.data;
        setChild((prev) => ({
          ...prev,
          [parentId]: childData,
        }));
      })
    }
    setIsExpanded((prev) => ({
      ...prev,
      [parentId]: !isExpanded[parentId]
    }));
  };

  const handleActivate = (resourceId: string): void => {
    setIsActivated((prev) => ({...prev, [resourceId]: true}))
  }

  function Tree({namespace, spaceType, resource}: { namespace: string, spaceType: string, resource: Resource }) {
    if (resource.childCount > 0) {
      return (
        <SidebarMenuItem onClick={() => handleActivate(resource.id)}>
          <Collapsible
            className="group/collapsible [&[data-state=open]>button>svg:first-child]:rotate-90"
            open={isExpanded[resource.id]}
          >
            <CollapsibleTrigger asChild>
              <SidebarMenuButton isActive={resource.id == meta.resourceId}>
                <ChevronRight
                  className="transition-transform"
                  onClick={() => handleExpand(namespace, spaceType, resource.id)}
                />
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
          isActive={resource.id == meta.resourceId}
          onClick={() => handleActivate(resource.id)}
        >
          <File/>
          {resource.name}
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
          <Space key={index} spaceType={spaceType} namespace={meta.namespace}/>
        ))}
      </SidebarContent>
      <SidebarRail/>
    </Sidebar>
  )
}


