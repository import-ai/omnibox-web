import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {MoreHorizontal} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import React from "react";

interface AppSidebarItemProps {
  level: number;
  title: React.ReactNode; // Updated to support JSX elements
  actions?: Array<{ label: string; onClick: () => void }>; // Optional dropdown actions
}

export function AppSidebarItem({title, level, actions}: AppSidebarItemProps) {
  return (
    <SidebarMenuItem style={{marginLeft: `${level}em`}}>
      <SidebarMenuButton asChild>
        <div>{title}</div>
      </SidebarMenuButton>
      {actions && actions.length > 0 && ( // Render dropdown only if actions are provided
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuAction>
              <MoreHorizontal/>
            </SidebarMenuAction>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start">
            {actions.map((action, index) => (
              <DropdownMenuItem key={index} onClick={action.onClick}>
                <span>{action.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </SidebarMenuItem>
  );
}
