import { ChevronDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import Space from '@/components/space';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/tooltip';
import { Avatar } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
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
import useConfig from '@/hooks/use-config';
import useNamespaces from '@/hooks/use-namespaces';
import useProNamespaces from '@/hooks/use-pro-namespaces';
import { Namespace } from '@/interface';
import { cn } from '@/lib/utils';
import { useChatStore } from '@/page/chat/chat-store';
import { SettingButton } from '@/page/settings/settings-trigger';
import { useSidebarStore } from '@/page/sidebar/store';
import { Logout } from '@/page/user/logout';

import Generate from './create-namespace';
import { InviteButton } from './invite-button';
import { NamespaceList } from './namespace-list';
import NamespaceMember from './namespace-member';

interface IProps {
  namespaceId: string;
}

export function Switcher(props: IProps) {
  const { namespaceId } = props;
  const { open, isMobile } = useSidebar();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { config, loading: configLoading } = useConfig();
  const commercial = config.commercial;
  const openSourceNamespace = useNamespaces({
    disabled: configLoading || commercial,
  });
  const proNamespace = useProNamespaces({
    disabled: configLoading || !commercial,
  });
  const { data } = useMemo(
    () => (commercial ? proNamespace : openSourceNamespace),
    [commercial, proNamespace, openSourceNamespace]
  );
  const current = useMemo(() => {
    const found = data.find(item => item.id === namespaceId);
    return found || { name: 'Unknown', id: '' };
  }, [data, namespaceId]);
  const handleNamespaceSelect = (item: Namespace) => {
    if (item.id === namespaceId) {
      return;
    }
    useChatStore.getState().clearContext();
    useSidebarStore.getState().clear();
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
            <SidebarMenuButton className="h-auto w-full gap-[6px] px-1.5">
              <div className="flex size-6 flex-shrink-0 items-center justify-center rounded-[8px] bg-primary text-[12px] text-primary-foreground dark:bg-neutral-700 dark:text-white">
                {current.name?.charAt(0)?.toUpperCase() || '?'}
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
              <div className="flex items-center gap-1 pt-1 text-left text-sm">
                <Avatar className="flex size-8 items-center justify-center rounded-lg bg-primary font-normal text-primary-foreground dark:bg-neutral-700 dark:text-white">
                  {current.name?.charAt(0)?.toUpperCase() || '?'}
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{current.name}</span>
                  <NamespaceMember namespaceId={namespaceId} />
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuLabel className="p-0">
              <Space className="flex-col items-stretch gap-1">
                <SettingButton />
                <InviteButton namespaceId={namespaceId} />
              </Space>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="mx-0" />
            <DropdownMenuLabel className="py-2 text-xs font-medium text-muted-foreground">
              {t('namespace.name')}
            </DropdownMenuLabel>
            <div
              className="max-h-[35vh] overflow-y-auto overflow-x-hidden"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <NamespaceList
                namespaces={data}
                currentId={namespaceId}
                onSelect={handleNamespaceSelect}
              />
            </div>
            <DropdownMenuSeparator className="mx-0" />
            <DropdownMenuLabel className="p-0">
              <Generate onCloseDropdown={() => setDropdownOpen(false)} />
            </DropdownMenuLabel>
            <DropdownMenuLabel className="p-0">
              <Logout />
            </DropdownMenuLabel>
          </DropdownMenuContent>
        </DropdownMenu>
        {open && !isMobile && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarTrigger className="text-neutral-400 hover:bg-[#E6E6EC] hover:text-neutral-400 dark:hover:bg-accent" />
              </TooltipTrigger>
              <TooltipContent>{t('sidebar.collapse')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
