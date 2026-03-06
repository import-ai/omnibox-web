import { ChevronDown } from 'lucide-react';
import { useMemo, useState } from 'react';
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
import useConfig from '@/hooks/use-config';
import useNamespace from '@/hooks/use-namespaces';
import useProNamespaces from '@/hooks/use-pro-namespaces';
import { Namespace } from '@/interface';
import { cn } from '@/lib/utils';
import { Logout } from '@/page/user/logout';

import Generate from './generate';
import { InviteButton } from './invite-button';
import NamespaceMember from './member';
import { NamespaceList } from './namespace-list';
import { SettingButton } from './setting';

interface IProps {
  namespaceId: string;
}

export function Switcher(props: IProps) {
  const { namespaceId } = props;
  const { open, isMobile } = useSidebar();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { config } = useConfig();
  const commercial = config.commercial;
  const openSourceNamespace = useNamespace({ disabled: commercial });
  const proNamespace = useProNamespaces({ disabled: !commercial });
  const { app, data } = useMemo(
    () => (commercial ? proNamespace : openSourceNamespace),
    [proNamespace, openSourceNamespace]
  );
  const current = useMemo(
    () =>
      data.find(item => item.id === namespaceId) || {
        name: '--',
      },
    [data, namespaceId]
  );
  const handleNamespaceSelect = (item: Namespace) => {
    if (item.id === namespaceId) {
      return;
    }
    app.fire('context_clear');
    app.fire('clean_resource');
    navigate(`/${item.id}/chat`);
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem
        className={cn({
          'flex justify-between items-center': open,
        })}
      >
        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
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
                <InviteButton namespaceId={namespaceId} />
              </Space>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="my-2" />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              {t('namespace.name')}
            </DropdownMenuLabel>
            <NamespaceList
              namespaces={data}
              currentId={namespaceId}
              onSelect={handleNamespaceSelect}
            />
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="p-0">
              <Generate onCloseDropdown={() => setDropdownOpen(false)} />
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
                <SidebarTrigger className="text-neutral-400 hover:text-neutral-400 hover:bg-[#E6E6EC] dark:hover:bg-accent" />
              </TooltipTrigger>
              <TooltipContent>{t('sidebar.collapse')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
