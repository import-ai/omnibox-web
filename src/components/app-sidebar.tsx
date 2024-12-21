import { useEffect, useState, useCallback } from "react";
import { Search, ChevronRight, ChevronDown } from "lucide-react";
import axios from "axios";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { AppSidebarItem } from "@/components/app-sidebar-item";

interface Resource {
  id: string;
  name: string;
  resourceType: string;
  space: string;
  childCount: number;
  children?: Resource[];
  isExpanded?: boolean; // 是否展开
  isLoading?: boolean; // 是否加载中
}

const NAMESPACE = "test";

export function AppSidebar() {
  const [resources, setResources] = useState<Resource[]>([]);

  // Fetch child resources for a given parent
  const fetchResources = useCallback(async (namespace: string, parentId?: string) => {
    try {
      const response = await axios.get(`/api/v1/resources`, { params: { namespace, parentId } });
      const data: Resource[] = response.data;
      console.log(data[0]);
      return data;
    } catch (error) {
      console.error("Failed to fetch resources:", error);
      return [];
    }
  }, []);

  // Toggle expand/collapse for a specific resource
  const toggleExpand = useCallback(
    async (resourceId: string) => {
      setResources((prev) => {
        const toggleNode = (nodes: Resource[]): Resource[] => {
          return nodes.map((node) => {
            if (node.id === resourceId) {
              // Toggle expanded state
              const isExpanding = !node.isExpanded;
              return {
                ...node,
                isExpanded: isExpanding,
                isLoading: isExpanding && !node.children, // Start loading if expanding and no children
              };
            } else if (node.children) {
              return {
                ...node,
                children: toggleNode(node.children),
              };
            }
            return node;
          });
        };
        return toggleNode(prev);
      });

      // If expanding and no children loaded, fetch them
      setResources((prev) => {
        const addChildren = (nodes: Resource[]): Resource[] => {
          return nodes.map((node) => {
            if (node.id === resourceId && node.isExpanded && !node.children) {
              fetchResources(NAMESPACE, resourceId).then((children) => {
                setResources((current) => {
                  const updateTree = (tree: Resource[]): Resource[] => {
                    return tree.map((item) => {
                      if (item.id === resourceId) {
                        return {
                          ...item,
                          children,
                          isLoading: false,
                        };
                      } else if (item.children) {
                        return {
                          ...item,
                          children: updateTree(item.children),
                        };
                      }
                      return item;
                    });
                  };
                  return updateTree(current);
                });
              });
            }
            return node;
          });
        };
        return addChildren(prev);
      });
    },
    [fetchResources]
  );

  // Fetch root resources on initial load
  useEffect(() => {
    fetchResources(NAMESPACE).then((data) => setResources(data));
  }, [fetchResources]);

  // Recursive function to render resources
  const renderResources = (resources: Resource[], level: number = 0) => {
    return resources.map((resource) => (
      <div key={resource.id}>
        <AppSidebarItem
          level={level}
          title={
            <div
              style={{ display: "flex", alignItems: "center", cursor: resource.childCount > 0 ? "pointer" : "default" }}
              onClick={resource.childCount > 0 ? () => toggleExpand(resource.id) : undefined}
            >
              {resource.childCount > 0 ? (
                resource.isExpanded ? <ChevronDown /> : <ChevronRight />
              ) : null}
              <span style={{ marginLeft: 8 }}>{resource.name}</span>
            </div>
          }
        />
        {resource.isExpanded && resource.children && (
          <SidebarMenu>
            {renderResources(resource.children, level + 1)}
          </SidebarMenu>
        )}
        {resource.isExpanded && resource.isLoading && (
          <p style={{ marginLeft: 16 }}>Loading...</p>
        )}
      </div>
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
            <SidebarMenu>{renderResources(resources)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Teamspace</SidebarGroupLabel>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
