import {SidebarMenuAction, SidebarMenuButton, SidebarMenuItem,} from "@/components/ui/sidebar"
import {MoreHorizontal} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu.tsx";

interface AppSidebarItemProps {
  level: number;
  title: string;
}

export function AppSidebarItem({title, level}: AppSidebarItemProps) {
  return (
      <SidebarMenuItem style={{marginLeft: `${level}em`}}>
        <SidebarMenuButton asChild>
          <a>{title}</a>
        </SidebarMenuButton>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuAction>
              <MoreHorizontal/>
            </SidebarMenuAction>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start">
            <DropdownMenuItem>
              <span>Doc</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <span>URL</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <span>File</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
  )
}
