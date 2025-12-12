import {
  BrainCircuit,
  KeyRound,
  List,
  MonitorCog,
  UserCog,
  Users,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { DarkRegularIcon } from '@/assets/icons/darkRegular';
import { DarkWhiteIcon } from '@/assets/icons/darkWhite';
import { LightBlackIcon } from '@/assets/icons/lightBlack';
import { LightRegularIcon } from '@/assets/icons/lightRegular';
import useTheme from '@/hooks/use-theme';
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

interface MenuItemWithDynamicIcon {
  label: string;
  value: string;
  icon: (selected: boolean) => React.ReactNode;
  requireOwner?: boolean;
}

export function SettingsSidebar({
  value,
  onChange,
  username,
  userIsOwner,
}: SettingsSidebarProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  // Determine if dark mode is active
  const isDarkMode =
    theme.skin === 'dark' ||
    (theme.skin === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Get the appropriate AppManager icon based on theme and selection state
  const getAppManagerIcon = (selected: boolean) => {
    if (isDarkMode) {
      return selected ? (
        <DarkWhiteIcon className="size-4" />
      ) : (
        <DarkRegularIcon className="size-4" />
      );
    }
    return selected ? (
      <LightBlackIcon className="size-4" />
    ) : (
      <LightRegularIcon className="size-4" />
    );
  };

  // Account section items - icons match Figma design
  const accountItems: MenuItem[] = [
    {
      label: t('setting.preferences'),
      value: 'basic',
      icon: <UserCog className="size-4" />,
    },
    {
      label: t('setting.content'),
      value: 'content',
      icon: <BrainCircuit className="size-4" />,
    },
  ];

  // Space section items
  const spaceItems: (MenuItem | MenuItemWithDynamicIcon)[] = [
    {
      label: t('setting.general'),
      value: 'namespace',
      icon: <MonitorCog className="size-4" />,
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
      icon: (selected: boolean) => getAppManagerIcon(selected),
    },
    {
      label: t('setting.api_key'),
      value: 'apikey',
      icon: <KeyRound className="size-4" />,
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
    <div className="relative h-auto lg:h-full w-full lg:w-[247px] shrink-0 rounded-t-xl lg:rounded-l-xl lg:rounded-tr-none bg-muted dark:bg-neutral-800 overflow-y-auto lg:overflow-visible">
      <div className="p-3 lg:absolute lg:left-2 lg:top-3 lg:w-[231px] flex flex-col gap-1 lg:gap-5">
        {/* Account Section */}
        <div className="flex w-full flex-col gap-2 lg:gap-2">
          <div className="hidden lg:block px-2">
            <span className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
              {t('setting.account')}
            </span>
          </div>

          <div className="flex w-full flex-row flex-wrap lg:flex-col gap-1 lg:gap-0.5">
            <button
              onClick={() => onChange('profile')}
              className={cn(
                'flex h-[30px] w-auto lg:w-full items-center gap-2 lg:gap-3 rounded px-2.5 py-1 text-left',
                value === 'profile'
                  ? 'bg-neutral-200 dark:bg-neutral-700'
                  : 'hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50'
              )}
            >
              <div className="relative flex size-[21px] shrink-0 items-center justify-center">
                <div
                  className="absolute inset-0 rounded bg-primary dark:bg-neutral-950"
                  style={{ boxShadow: '0 1px 2px 0 #00000040' }}
                />
                <span className="relative text-xs font-semibold text-primary-foreground dark:text-white">
                  {initial}
                </span>
              </div>
              <span className="truncate whitespace-nowrap text-sm font-semibold text-foreground">
                {displayName}
              </span>
            </button>

            {accountItems.map(item => {
              const isSelected = value === item.value;
              return (
                <button
                  key={item.value}
                  onClick={() => onChange(item.value)}
                  className={cn(
                    'flex h-[30px] w-auto lg:w-full items-center gap-3 rounded px-3 text-left',
                    isSelected
                      ? 'bg-neutral-200 dark:bg-neutral-700'
                      : 'hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50'
                  )}
                >
                  <span
                    className={cn(
                      'size-4 shrink-0',
                      isSelected ? 'text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    {item.icon}
                  </span>
                  <span
                    className={cn(
                      'whitespace-nowrap text-sm font-medium',
                      isSelected ? 'text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Space Section */}
        <div className="flex w-full flex-col gap-2 lg:gap-2">
          <div className="hidden lg:block px-2">
            <span className="w-full text-xs font-semibold text-muted-foreground">
              {t('setting.space')}
            </span>
          </div>

          <div className="flex w-full flex-row flex-wrap lg:flex-col gap-1 lg:gap-0.5 px-0 lg:px-2">
            {filteredSpaceItems.map(item => {
              const isSelected = value === item.value;
              const icon =
                typeof item.icon === 'function'
                  ? item.icon(isSelected)
                  : item.icon;

              return (
                <button
                  key={item.value}
                  onClick={() => onChange(item.value)}
                  className={cn(
                    'flex h-[30px] w-auto lg:w-full items-center gap-3 rounded px-2 lg:px-1 text-left',
                    isSelected
                      ? 'bg-neutral-200 dark:bg-neutral-700'
                      : 'hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50'
                  )}
                >
                  <span
                    className={cn(
                      'size-4 shrink-0',
                      isSelected ? 'text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    {icon}
                  </span>
                  <span
                    className={cn(
                      'whitespace-nowrap text-sm font-medium',
                      isSelected ? 'text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
