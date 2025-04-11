import React from 'react';
import Space from '@/components/space';
import SettingsPage from '@/app/user/profile';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { ChevronDown, Plus, UserPlus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

type Namespace = {
  name: string;
  logo: React.ElementType;
};

export function NamespaceSwitcher({ namespaces }: { namespaces: Namespace[] }) {
  const [activeNamespace, setActiveNamespace] = React.useState(namespaces[0]);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton className="w-fit px-1.5">
              <div className="flex aspect-square size-5 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                <activeNamespace.logo className="size-3" />
              </div>
              <span className="truncate font-semibold">
                {activeNamespace.name}
              </span>
              <ChevronDown className="opacity-50" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-64 rounded-lg"
            align="start"
            side="bottom"
            sideOffset={4}
          >
            <DropdownMenuLabel>
              <div className="flex items-center gap-2 px-1 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg flex items-center justify-center bg-sidebar-primary text-sidebar-primary-foreground">
                  <activeNamespace.logo className="cover" />
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">
                    {activeNamespace.name}
                  </span>
                  <span className="truncate text-xs">--</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuLabel className="pt-1 pb-0">
              <Space>
                <SettingsPage />
                <Button
                  size="sm"
                  variant="outline"
                  className="text-muted-foreground h-7 gap-1 px-2"
                >
                  <UserPlus />
                  邀请成员
                </Button>
              </Space>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="my-2" />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Namespaces
            </DropdownMenuLabel>
            {namespaces.map((namespace, index) => (
              <DropdownMenuItem
                key={namespace.name}
                onClick={() => setActiveNamespace(namespace)}
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-sm border">
                  <namespace.logo className="size-4 shrink-0" />
                </div>
                {namespace.name}
                <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2" disabled>
              <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                <Plus className="size-4" />
              </div>
              <div className="font-medium text-muted-foreground">
                Add namespace
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
