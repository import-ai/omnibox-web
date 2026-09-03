import { ChevronDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { CrownIcon } from '@/assets/icons/CrownIcon';
import { UpgradeIcon } from '@/assets/icons/UpgradeIcon';
import { SidebarTriggerButton } from '@/components/SidebarTriggerButton';
import Space from '@/components/space';
import { Avatar } from '@/components/ui/Avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/Sidebar';
import useFeaturePreviews from '@/hooks/useFeaturePreviews';
import { Namespace } from '@/interface';
import { resetChatForNamespaceSwitch } from '@/lib/chatBridge';
import { getUpgradeLink } from '@/lib/upgradeLink';
import { cn } from '@/lib/utils';
import { SettingButton } from '@/page/settings/SettingButton';
import { useSidebarStore } from '@/page/sidebar/store';
import { Logout } from '@/page/user/Logout';

import { getPricingEntryVariant } from '../pricingEntry';
import Generate from './Generate';
import { InviteButton } from './InviteButton';
import { NamespaceList } from './NamespaceList';
import NamespaceMember from './NamespaceMember';
import { NamespaceTierBadge } from './NamespaceTierBadge';

interface IProps {
  commercial?: boolean;
  namespaceId: string;
  namespaces: Namespace[];
}

export function Switcher(props: IProps) {
  const { commercial, namespaceId, namespaces } = props;
  const { open } = useSidebar();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  useFeaturePreviews();

  const current = useMemo(() => {
    const found = namespaces.find(item => item.id === namespaceId);
    return found || { name: 'Unknown', id: '' };
  }, [namespaceId, namespaces]);
  const pricingEntryVariant = commercial
    ? getPricingEntryVariant(current)
    : undefined;
  const handleNamespaceSelect = (item: Namespace) => {
    if (item.id === namespaceId) {
      return;
    }
    resetChatForNamespaceSwitch(namespaceId);
    useSidebarStore.getState().clear();
    navigate(`/${item.id}/chat`);
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem
        className={cn({
          'flex items-center justify-between': open,
        })}
      >
        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton className="h-auto w-full gap-1.5 px-1.5">
              <div className="flex size-6 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-xs text-primary-foreground dark:bg-neutral-700 dark:text-white">
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
                <div className="grid min-w-0 flex-1 text-left text-sm leading-tight gap-0.5">
                  <span className="truncate font-semibold">{current.name}</span>
                  <div className="flex min-w-0 items-center justify-between gap-2">
                    <NamespaceMember namespaceId={namespaceId} />
                    <NamespaceTierBadge namespace={current} />
                  </div>
                </div>
              </div>
            </DropdownMenuLabel>
            {pricingEntryVariant && (
              <DropdownMenuItem
                asChild
                className={cn(
                  'h-8 cursor-pointer gap-1 px-2 py-0 text-xs font-medium',
                  'text-blue-500 hover:text-blue-500 focus:text-blue-500',
                  'active:text-blue-500 data-[highlighted]:text-blue-500'
                )}
              >
                <a
                  href={getUpgradeLink(i18n, namespaceId)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {pricingEntryVariant === 'upgrade' ? (
                    <UpgradeIcon className="size-4 shrink-0 text-blue-500 hover:text-blue-500 focus:text-blue-500 active:text-blue-500" />
                  ) : (
                    <CrownIcon className="size-4 shrink-0 text-blue-500 hover:text-blue-500 focus:text-blue-500 active:text-blue-500" />
                  )}
                  <span>{t(`namespace.${pricingEntryVariant}`)}</span>
                </a>
              </DropdownMenuItem>
            )}
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
                namespaces={namespaces}
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
        <SidebarTriggerButton collapse={false} />
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
