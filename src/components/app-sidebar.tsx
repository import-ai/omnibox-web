import {MoreHorizontal, Search} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";

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

export function AppSidebar() {
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
              <SidebarMenuItem style={{marginLeft: "0em"}}>
                <SidebarMenuButton asChild>
                  <p>Private grand parent</p>
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
              </SidebarMenuItem>
              <SidebarMenuItem style={{marginLeft: "1em"}}>
                <SidebarMenuButton asChild>
                  <p>Private Parent 0</p>
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
              </SidebarMenuItem>
              <SidebarMenuItem style={{marginLeft: "2em"}}>
                <SidebarMenuButton asChild>
                  <p>Private Child</p>
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
              </SidebarMenuItem>
              <SidebarMenuItem style={{marginLeft: "1em"}}>
                <SidebarMenuButton asChild>
                  <p>Private Parent 1</p>
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
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Teamspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem style={{marginLeft: "0em"}}>
                <SidebarMenuButton asChild>
                  <p>Teamspace grand parent 0</p>
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
              </SidebarMenuItem>
              <SidebarMenuItem style={{marginLeft: "1em"}}>
                <SidebarMenuButton asChild>
                  <p>Teamspace Parent 0</p>
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
              </SidebarMenuItem>
              <SidebarMenuItem style={{marginLeft: "2em"}}>
                <SidebarMenuButton asChild>
                  <p>Teamspace Child</p>
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
              </SidebarMenuItem>
              <SidebarMenuItem style={{marginLeft: "1em"}}>
                <SidebarMenuButton asChild>
                  <p>Teamspace Parent 1</p>
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
              </SidebarMenuItem>
              <SidebarMenuItem style={{marginLeft: "0em"}}>
                <SidebarMenuButton asChild>
                  <p>Teamspace grand parent 1</p>
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
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
