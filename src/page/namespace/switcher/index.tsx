import Invite from './invite';
import Profile from './setting';
import { cn } from '@/lib/utils';
import Generate from './generate';
import Space from '@/components/space';
import { Logout } from '@/page/user/logout';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '@/components/ui/avatar';
import useNamespace from '@/hooks/use-namespace';
import { ChevronDown, Command } from 'lucide-react';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface IProps {
  namespace: string;
}

export function Switcher(props: IProps) {
  const { namespace } = props;
  const navigate = useNavigate();
  const { data } = useNamespace();
  const current = data.find((item) => item.id === namespace) || { name: '--' };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton className="w-fit px-1.5">
              <div className="flex aspect-square size-5 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                <Command className="size-3" />
              </div>
              <span className="truncate font-semibold">{current.name}</span>
              <ChevronDown className="opacity-50" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            side="bottom"
            sideOffset={4}
            className="w-64 rounded-lg"
          >
            <DropdownMenuLabel>
              <div className="flex items-center gap-2 px-1 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg flex items-center justify-center bg-sidebar-primary text-sidebar-primary-foreground">
                  <Command className="cover" />
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{current.name}</span>
                  <span className="truncate text-xs">--</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuLabel className="pt-1 pb-0">
              <Space>
                <Profile />
                <Invite />
              </Space>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="my-2" />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Namespaces
            </DropdownMenuLabel>
            {data.map((item, index) => (
              <DropdownMenuItem
                key={item.id}
                disabled={item.id === namespace}
                className={cn('gap-2 p-2', {
                  'cursor-pointer': item.id !== namespace,
                })}
                onClick={() => {
                  if (item.id === namespace) {
                    return;
                  }
                  localStorage.setItem('namespace', JSON.stringify(item));
                  navigate(`/${item.id}`);
                }}
              >
                <div className="flex size-6 items-center justify-center rounded-sm border">
                  <Command className="size-4 shrink-0" />
                </div>
                {item.name}
                <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="p-0">
              <Generate />
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="p-0">
              <Logout />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
