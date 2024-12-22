import * as React from "react"
import axios from "axios";
import {ChevronRight, File, Folder} from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
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


type Resource = {
  id: string;
  name: string;
  parentId: string;
  childCount: number;
};

const fetchResources = async (namespace: string, spaceType: string, parentId: string | null = null): Promise<Resource[]> => {
  const response = await axios.get(
    `/api/v1/resources?namespace=${namespace}&spaceType=${spaceType}${parentId ? `&parentId=${parentId}` : ""}`
  );
  return response.data;
};

export function AppSidebar({...props}: React.ComponentProps<typeof Sidebar>) {
  const [rootResourceId, setRootResourceId] = React.useState<Record<string, string>>({});  //
  const [isExpanded, setIsExpanded] = React.useState<Record<string, boolean>>({});  // key: resourceId
  const [child, setChild] = React.useState<Record<string, Resource[]>>({});  // resourceId -> Resource[]

  const updateChild = (resourceId: string, resources: Resource[]) => {
    setChild((prev) => ({
      ...prev,
      [resourceId]: resources
    }));
    if (!(resourceId in isExpanded)) {
      setIsExpanded((prev) => ({
        ...prev,
        [resourceId]: false
      }));
    }
  };

  React.useEffect(() => {
    const loadInitialData = async () => {
      for (const spaceType of ["private", "teamspace"]) {
        const resources: Resource[] = await fetchResources("test", spaceType);
        if (resources.length > 0) {
          const parentId = resources[0].parentId;
          updateChild(parentId, resources);
          setRootResourceId((prev) => ({...prev, [spaceType]: parentId}));
        }
      }
    };

    loadInitialData()
  }, []);

  const handleExpand = async (namespace: string, spaceType: string, parentId: string) => {
    if (!(parentId in child)) {
      const childData = await fetchResources(namespace, spaceType, parentId);
      setChild((prev) => ({
        ...prev,
        [parentId]: childData,
      }));
    }
    setIsExpanded((prev) => ({
      ...prev,
      [parentId]: !isExpanded[parentId]
    }));
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
              <SidebarMenuButton>
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
      <SidebarMenuButton
        className="data-[active=true]:bg-transparent"
      >
        <File/>
        {resource.name}
      </SidebarMenuButton>
    )
  }

  function Space({spaceType}: {spaceType: string}) {
    const spaceTitle = `${spaceType.charAt(0).toUpperCase()}${spaceType.slice(1)}`
    return (
      <SidebarGroup>
        <SidebarGroupLabel>{spaceTitle}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {(child[rootResourceId[spaceType]] ?? []).map((resource) => (
              <Tree key={resource.id} resource={resource} namespace={"test"} spaceType={spaceType}/>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    )
  }

  return (
    <Sidebar {...props}>
      <SidebarContent>
        <Space spaceType={"private"}/>
        <Space spaceType={"teamspace"}/>
      </SidebarContent>
      <SidebarRail/>
    </Sidebar>
  )
}


