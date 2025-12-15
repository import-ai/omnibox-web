import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import Space from '@/components/space';
import { Avatar } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  // DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarTrigger } from '@/components/ui/sidebar';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useSidebar } from '@/components/ui/sidebar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import useNamespace from '@/hooks/use-namespaces';
import { cn } from '@/lib/utils';
import { Logout } from '@/page/user/logout';

import Generate from './generate';
import Invite from './invite';
import NamespaceMember from './member';
import { SettingButton } from './setting';

interface IProps {
  namespaceId: string;
}

export function Switcher(props: IProps) {
  const { namespaceId } = props;
  const { open, isMobile } = useSidebar();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { app, data } = useNamespace();
  const current = data.find(item => item.id === namespaceId) || {
    name: '--',
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem
        className={cn({
          'flex justify-between items-center': open,
        })}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton className="gap-[6px] w-full px-1.5 h-auto">
              <div className="flex flex-shrink-0 rounded-[8px] size-[24px] text-[12px] items-center justify-center bg-primary text-primary-foreground dark:bg-neutral-700 dark:text-white">
                {current.name.charAt(0).toUpperCase()}
              </div>
              <span className="truncate">{current.name}</span>
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
                <Avatar className="size-8 font-normal rounded-lg flex items-center justify-center bg-primary text-primary-foreground dark:bg-neutral-700 dark:text-white">
                  {current.name.charAt(0).toUpperCase()}
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{current.name}</span>
                  <NamespaceMember namespaceId={namespaceId} />
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuLabel className="pt-1 pb-0">
              <Space>
                <SettingButton />
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
                <div className="flex rounded-[6px] size-6 text-[11px] font-normal items-center justify-center border">
                  {item.name.charAt(0).toUpperCase()}
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
        {open && !isMobile && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarTrigger className="text-[#8F959E] hover:text-[#8F959E] hover:bg-[#E6E6EC]" />
              </TooltipTrigger>
              <TooltipContent>{t('sidebar.collapse')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
