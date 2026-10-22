import {
  BrainCircuit,
  FlaskConical,
  Gauge,
  HouseCog,
  KeyRound,
  List,
  MonitorSmartphone,
  Sun,
  Users,
} from 'lucide-react';
import { useContext } from 'react';
import { useTranslation } from 'react-i18next';

import { AppManagerIcon } from '@/assets/icons/AppManagerIcon';
import logoUrl from '@/assets/logo.svg';
import useConfig from '@/hooks/useConfig';
import { cn } from '@/lib/utils';
import { UpgradeButton } from '@/page/sidebar/components/namespace-switcher/UpgradeButton';

import { SettingsExtensionsContext } from './settingsExtensionsContext';

interface SettingsSidebarProps {
  value: string;
  onChange: (value: string) => void;
  username: string;
}

interface MenuItem {
  hidden?: boolean;
  label: React.ReactNode;
  value: string;
  icon: React.ReactNode;
}

export function SettingsSidebar({
  value,
  onChange,
  username,
}: SettingsSidebarProps) {
  const { t } = useTranslation();
  const { config } = useConfig();
  const extensions = useContext(SettingsExtensionsContext);

  // Account section items - icons match Figma design
  const accountItems: MenuItem[] = [
    {
      label: t('setting.preferences'),
      value: 'basic',
      icon: <Sun className="size-4" />,
    },
    {
      label: t('local_runtime.title'),
      value: 'localRuntime',
      icon: <MonitorSmartphone className="size-4" />,
    },
    {
      label: t('setting.feature_management'),
      value: 'content',
      icon: <BrainCircuit className="size-4" />,
    },
    {
      label: t('setting.feature_previews'),
      value: 'featurePreviews',
      // Hidden until a new preview is available; keep the tab for future use.
      // TODO: Restore useFeaturePreviews() in namespace-switcher and SharePage
      // when reopening this entry so previews apply before settings are opened.
      hidden: true,
      icon: <FlaskConical className="size-4" />,
    },
    ...extensions
      .filter(extension => (extension.group ?? 'account') === 'account')
      .map(extension => ({
        value: `extension:${extension.id}`,
        label: extension.label,
        icon: extension.icon,
      })),
  ];

  // Space section items
  const spaceItems: MenuItem[] = [
    {
      label: t('setting.general'),
      value: 'namespace',
      icon: <HouseCog className="size-4" />,
    },
    ...(config.commercial
      ? [
          {
            label: t('namespace.usage'),
            value: 'usage',
            icon: <Gauge className="size-4" />,
          },
        ]
      : []),
    {
      label: t('setting.members'),
      value: 'people',
      icon: <Users className="size-4" />,
    },
    {
      label: t('setting.tasks'),
      value: 'tasks',
      icon: <List className="size-4" />,
    },
    {
      label: t('setting.applications'),
      value: 'applications',
      icon: <AppManagerIcon className="size-4" />,
    },
    {
      label: t('setting.api_key'),
      value: 'apikey',
      icon: <KeyRound className="size-4" />,
    },
    ...extensions
      .filter(extension => extension.group === 'space')
      .map(extension => ({
        value: `extension:${extension.id}`,
        label: extension.label,
        icon: extension.icon,
      })),
  ];

  // About section item
  const aboutItem: MenuItem = {
    label: t('setting.about'),
    value: 'about',
    icon: <img src={logoUrl} alt="" className="size-4" />,
  };

  // Get username initial
  const initial = username?.charAt(0)?.toUpperCase() || 'U';
  // Truncate username if too long (Figma shows "User's NameNameName...")
  const displayName =
    username && username.length > 18
      ? username.slice(0, 18) + '...'
      : username || 'User';

  return (
    <div className="relative h-auto w-full shrink-0 overflow-y-auto rounded-t-xl bg-sidebar lg:h-full lg:w-[247px] lg:overflow-visible lg:rounded-l-xl lg:rounded-tr-none">
      <div className="flex flex-col gap-1 p-2 lg:absolute lg:inset-2 lg:w-[231px] lg:justify-between lg:gap-5 lg:p-0">
        <div className="flex flex-col gap-1 lg:gap-5">
          {/* Account Section */}
          <div className="flex w-full flex-col gap-2 lg:gap-2">
            <div className="hidden px-2 lg:block">
              <span className="whitespace-nowrap text-xs font-semibold text-muted-foreground">
                {t('setting.account')}
              </span>
            </div>

            <div className="flex w-full flex-row flex-wrap gap-1 lg:flex-col lg:gap-0.5">
              <button
                onClick={() => onChange('profile')}
                className={cn(
                  'flex h-[30px] w-auto items-center gap-2 rounded px-2.5 py-1 text-left lg:w-full lg:gap-3',
                  value === 'profile'
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'hover:bg-sidebar-accent/60'
                )}
              >
                <div className="relative flex size-[21px] shrink-0 items-center justify-center">
                  <div className="absolute inset-0 rounded bg-primary shadow-[0_1px_2px_0_#00000040] dark:bg-sidebar" />
                  <span className="relative text-xs font-normal text-primary-foreground dark:text-sidebar-foreground">
                    {initial}
                  </span>
                </div>
                <span className="truncate whitespace-nowrap text-sm font-semibold text-foreground">
                  {displayName}
                </span>
              </button>

              {accountItems.map(item => {
                if (item.hidden) return null;
                const isSelected = value === item.value;
                return (
                  <button
                    key={item.value}
                    onClick={() => onChange(item.value)}
                    className={cn(
                      'flex h-[30px] w-auto items-center gap-3 rounded px-3 text-left lg:w-full',
                      isSelected
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'hover:bg-sidebar-accent/60'
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
            <div className="hidden px-2 lg:block">
              <span className="w-full text-xs font-semibold text-muted-foreground">
                {t('setting.space')}
              </span>
            </div>

            <div className="flex w-full flex-row flex-wrap gap-1 lg:flex-col lg:gap-0.5">
              {spaceItems.map(item => {
                const isSelected = value === item.value;

                return (
                  <button
                    key={item.value}
                    onClick={() => onChange(item.value)}
                    className={cn(
                      'flex h-[30px] w-auto items-center gap-3 rounded px-3 text-left lg:w-full',
                      isSelected
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'hover:bg-sidebar-accent/60'
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
        </div>

        <div className="flex w-full flex-col gap-2 lg:gap-2">
          <div className="flex w-full flex-row flex-wrap gap-1 lg:flex-col lg:gap-0.5">
            {config.commercial && <UpgradeButton />}
            <button
              onClick={() => onChange(aboutItem.value)}
              className={cn(
                'flex h-[30px] w-auto items-center gap-3 rounded px-3 text-left lg:w-full',
                value === aboutItem.value
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'hover:bg-sidebar-accent/60'
              )}
            >
              <span
                className={cn(
                  'size-4 shrink-0',
                  value === aboutItem.value
                    ? 'text-foreground'
                    : 'text-muted-foreground'
                )}
              >
                {aboutItem.icon}
              </span>
              <span
                className={cn(
                  'whitespace-nowrap text-sm font-medium',
                  value === aboutItem.value
                    ? 'text-foreground'
                    : 'text-muted-foreground'
                )}
              >
                {aboutItem.label}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
