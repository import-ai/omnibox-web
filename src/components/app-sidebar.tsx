import {useState, useEffect} from "react";
import axios from "axios";
import {MoreHorizontal, Search, ChevronRight, ChevronDown} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
} from "@/components/ui/sidebar";

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

export function AppSidebar() {
  const [rootResourceId, setRootResourceId] = useState<Record<string, string>>({});
  const [isExpanded, setIsExpanded] = useState<Record<string, boolean>>({});
  const [child, setChild] = useState<Record<string, Resource[]>>({});

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

  useEffect(() => {
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

  const renderResources = (resources: Resource[], namespace: string, spaceType: string, level: number = 0) => {
    return (resources ?? []).map((resource: Resource) => (
      <SidebarMenuItem key={resource.id} style={{marginLeft: `${level}em`}}>
        <SidebarMenuButton asChild>
          <div style={{ userSelect: 'none', border: 'none' }}>
            {resource.childCount > 0 && (
              <a
                onClick={() => handleExpand(namespace, spaceType, resource.id)}
                style={{ cursor: 'pointer' }}
              >
                {isExpanded[resource.id] ? <ChevronDown/> : <ChevronRight/>}
              </a>
            )}
            <a
              onClick={() => handleTextClick(resource.id)}
              style={{ cursor: 'pointer' }}
            >
              <span>{resource.name}</span>
            </a>
          </div>
        </SidebarMenuButton>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuAction>
              <MoreHorizontal/>
            </SidebarMenuAction>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start">
            <DropdownMenuItem>Create Document</DropdownMenuItem>
            <DropdownMenuItem>Upload File</DropdownMenuItem>
            <DropdownMenuItem>Add Link</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {child[resource.id] && isExpanded[resource.id] && renderResources(child[resource.id], namespace, spaceType, level + 1)}
      </SidebarMenuItem>
    ));
  };

  const handleTextClick = (resourceId: string) => {
    console.log(`Text clicked for resource: ${resourceId}`);
    // Add your logic here for what should happen when the text is clicked
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <p>
                <Search/>
                <span>Search</span>
              </p>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Private</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {renderResources(child[rootResourceId["private"]], "test", "private")}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>teamspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {renderResources(child[rootResourceId["teamspace"]], "test", "teamspace")}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
