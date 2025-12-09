import {
  Key,
  LayoutGrid,
  List,
  RefreshCcw,
  Settings2,
  SlidersHorizontal,
  Users,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

interface SettingsSidebarProps {
  value: string;
  onChange: (value: string) => void;
  username: string;
  userIsOwner: boolean;
}

interface MenuItem {
  label: string;
  value: string;
  icon: React.ReactNode;
  requireOwner?: boolean;
}

export function SettingsSidebar({
  value,
  onChange,
  username,
  userIsOwner,
}: SettingsSidebarProps) {
  const { t } = useTranslation();

  // Account section items - icons match Figma design
  const accountItems: MenuItem[] = [
    {
      label: t('setting.general'),
      value: 'basic',
      icon: <Settings2 className="size-4" />,
    },
    {
      label: t('setting.content'),
      value: 'content',
      icon: <SlidersHorizontal className="size-4" />,
    },
  ];

  // Space section items
  const spaceItems: MenuItem[] = [
    {
      label: t('setting.general'),
      value: 'namespace',
      icon: <RefreshCcw className="size-4" />,
      requireOwner: true,
    },
    {
      label: t('setting.members'),
      value: 'people',
      icon: <Users className="size-4" />,
      requireOwner: true,
    },
    {
      label: t('setting.tasks'),
      value: 'tasks',
      icon: <List className="size-4" />,
    },
    {
      label: t('setting.applications'),
      value: 'applications',
      icon: <LayoutGrid className="size-4" />,
    },
    {
      label: t('setting.api_key'),
      value: 'apikey',
      icon: <Key className="size-4" />,
    },
  ];

  const filteredSpaceItems = spaceItems.filter(
    item => !item.requireOwner || userIsOwner
  );

  // Get username initial
  const initial = username?.charAt(0)?.toUpperCase() || 'U';
  // Truncate username if too long (Figma shows "User's NameNameName...")
  const displayName =
    username && username.length > 18
      ? username.slice(0, 18) + '...'
      : username || 'User';

  return (
    <div className="relative h-full w-[247px] shrink-0 rounded-l-xl bg-muted">
      <div className="absolute left-2 top-3 flex w-[231px] flex-col gap-5">
        {/* Account Section */}
        <div className="flex w-full flex-col gap-2">
          <div className="px-2">
            <span className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
              {t('setting.account')}
            </span>
          </div>

          <div className="flex w-full flex-col gap-0.5">
            <button
              onClick={() => onChange('profile')}
              className={cn(
                'flex h-[30px] w-full items-center gap-3 rounded px-2.5 py-1 text-left',
                value === 'profile'
                  ? 'bg-neutral-200'
                  : 'hover:bg-neutral-200/50'
              )}
            >
              <div className="relative flex size-[21px] shrink-0 items-center justify-center">
                <div className="absolute inset-0 rounded bg-primary shadow-sm" />
                <span className="relative text-xs font-semibold text-primary-foreground">
                  {initial}
                </span>
              </div>
              <span className="truncate whitespace-nowrap text-sm font-semibold text-foreground">
                {displayName}
              </span>
            </button>

            {accountItems.map(item => (
              <button
                key={item.value}
                onClick={() => onChange(item.value)}
                className={cn(
                  'flex h-[30px] w-full items-center gap-3 rounded px-3 text-left',
                  value === item.value
                    ? 'bg-neutral-200'
                    : 'hover:bg-neutral-200/50'
                )}
              >
                <span
                  className={cn(
                    'size-4 shrink-0',
                    value === item.value
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                  )}
                >
                  {item.icon}
                </span>
                <span
                  className={cn(
                    'whitespace-nowrap text-sm font-medium',
                    value === item.value
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                  )}
                >
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Space Section */}
        <div className="flex w-full flex-col gap-2">
          <div className="px-2">
            <span className="w-full text-xs font-semibold text-muted-foreground">
              {t('setting.space')}
            </span>
          </div>

          <div className="flex w-full flex-col gap-0.5 px-2">
            {filteredSpaceItems.map(item => (
              <button
                key={item.value}
                onClick={() => onChange(item.value)}
                className={cn(
                  'flex h-[30px] w-full items-center gap-3 rounded px-1 text-left',
                  value === item.value
                    ? 'bg-neutral-200'
                    : 'hover:bg-neutral-200/50'
                )}
              >
                <span
                  className={cn(
                    'size-4 shrink-0',
                    value === item.value
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                  )}
                >
                  {item.icon}
                </span>
                <span
                  className={cn(
                    'whitespace-nowrap text-sm font-medium',
                    value === item.value
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                  )}
                >
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
