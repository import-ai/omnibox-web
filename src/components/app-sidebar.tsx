import { useState, useEffect } from "react";
import axios from "axios";
import { MoreHorizontal, Search } from "lucide-react";
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

// Define the Resource type
type Resource = {
  id: string;
  name: string;
  // Add other properties if needed
};

const fetchResources = async (namespace: string, spaceType: string, parentId: string | null = null) => {
  const response = await axios.get(
    `/api/v1/resources?namespace=${namespace}&spaceType=${spaceType}${parentId ? `&parentId=${parentId}` : ""}`
  );
  return response.data;
};

export function AppSidebar() {
  const [privateResources, setPrivateResources] = useState<Resource[]>([]);
  const [teamspaceResources, setTeamspaceResources] = useState<Resource[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, Resource[] | null>>({});

  useEffect(() => {
    const loadInitialData = async () => {
      const privateData = await fetchResources("test", "private");
      setPrivateResources(privateData);

      const teamspaceData = await fetchResources("test", "teamspace");
      setTeamspaceResources(teamspaceData);
    };

    loadInitialData().then();
  }, []);

  const handleExpand = async (namespace: string, spaceType: string, parentId: string) => {
    if (!expandedNodes[parentId]) {
      const childData = await fetchResources(namespace, spaceType, parentId);
      setExpandedNodes((prev) => ({
        ...prev,
        [parentId]: childData,
      }));
    } else {
      setExpandedNodes((prev) => ({
        ...prev,
        [parentId]: null, // Collapse the node
      }));
    }
  };

  const renderResources = (resources: Resource[], namespace: string, spaceType: string, level: number = 0) => {
    return resources.map((resource: Resource) => (
      <SidebarMenuItem key={resource.id} style={{ marginLeft: `${level}em` }}>
        <SidebarMenuButton asChild>
          <p onClick={() => handleExpand(namespace, spaceType, resource.id)}>
            {resource.name}
          </p>
        </SidebarMenuButton>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuAction>
              <MoreHorizontal />
            </SidebarMenuAction>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start">
            <DropdownMenuItem>Create Document</DropdownMenuItem>
            <DropdownMenuItem>Upload File</DropdownMenuItem>
            <DropdownMenuItem>Add Link</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {expandedNodes[resource.id] &&
          renderResources(expandedNodes[resource.id] as Resource[], namespace, spaceType, level + 1)}
      </SidebarMenuItem>
    ));
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <p>
                <Search />
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
              {renderResources(privateResources, "test", "private")}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>teamspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {renderResources(teamspaceResources, "test", "teamspace")}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
