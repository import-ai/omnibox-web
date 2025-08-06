import Invite from './invite';
import Profile from './setting';
import { cn } from '@/lib/utils';
import Generate from './generate';
import NamespaceMember from './member';
import Space from '@/components/space';
import { Logout } from '@/page/user/logout';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '@/components/ui/avatar';
import useNamespace from '@/hooks/use-namespaces';
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
  // DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface IProps {
  namespaceId: string;
}

export function Switcher(props: IProps) {
  const { namespaceId } = props;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { app, data } = useNamespace();
  const current = data.find(item => item.id === namespaceId) || {
    name: '--',
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton className="w-full px-1.5">
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
                  <NamespaceMember namespaceId={namespaceId} />
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
              {t('namespace.name')}
            </DropdownMenuLabel>
            {data.map(item => (
              <DropdownMenuItem
                key={item.id}
                disabled={item.id === namespaceId}
                className={cn('gap-2 p-2', {
                  'cursor-pointer': item.id !== namespaceId,
                })}
                onClick={() => {
                  if (item.id === namespaceId) {
                    return;
                  }
                  app.fire('context_clear');
                  app.fire('clean_resource');
                  navigate(`/${item.id}/chat`);
                }}
              >
                <div className="flex size-6 items-center justify-center rounded-sm border">
                  <Command className="size-4 shrink-0" />
                </div>
                <span className="truncate">{item.name}</span>
                {/* <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut> */}
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
