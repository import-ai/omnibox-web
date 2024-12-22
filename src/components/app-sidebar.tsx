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
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarRail,
} from "@/components/ui/sidebar"

// This is sample data.
const data = {
  changes: [
    {
      file: "README.md",
      state: "M",
    },
    {
      file: "api/hello/route.ts",
      state: "U",
    },
    {
      file: "app/layout.tsx",
      state: "M",
    },
  ],
  tree: [
    [
      "app",
      [
        "api",
        ["hello", ["route.ts"]],
        "page.tsx",
        "layout.tsx",
        ["blog", ["page.tsx"]],
      ],
    ],
    [
      "components",
      ["ui", "button.tsx", "card.tsx"],
      "header.tsx",
      "footer.tsx",
    ],
    ["lib", ["util.ts"]],
    ["public", "favicon.ico", "vercel.svg"],
    ".eslintrc.json",
    ".gitignore",
    "next.config.js",
    "tailwind.config.js",
    "package.json",
    "README.md",
  ],
}

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

  return (
    <Sidebar {...props}>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Private</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {(child[rootResourceId["private"]] ?? []).map((resource) => (
                <Tree key={resource.id} resource={resource} child={child}/>
              ))
              }
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail/>
    </Sidebar>
  )
}

function Tree({resource, child}: { resource: Resource, child: Record<string, Resource[]> }) {
  if (resource.childCount > 0) {
    return (
      <SidebarMenuItem>
        <Collapsible
          className="group/collapsible [&[data-state=open]>button>svg:first-child]:rotate-90"
        >
          <CollapsibleTrigger asChild>
            <SidebarMenuButton>
              <ChevronRight className="transition-transform"/>
              <Folder/>
              {resource.name}
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              {(child[resource.id] ?? []).length > 0 &&
                child[resource.id].map((resource: Resource) => (
                  <Tree key={resource.id} resource={resource} child={child}/>
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
