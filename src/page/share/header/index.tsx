import { useTranslation } from 'react-i18next';

import { SidebarTriggerButton } from '@/components/SidebarTriggerButton';
import { LanguageToggle } from '@/components/toggle/LanguageToggle';
import { ThemeToggle } from '@/components/toggle/ThemeToggle';
import { useSidebar } from '@/components/ui/Sidebar';
import { PathItem } from '@/interface';
import { cn } from '@/lib/utils';
import { getTime } from '@/page/resource/utils';

import Actions from './ShareActions';
import ShareBreadcrumb from './ShareBreadcrumb';

interface ShareHeaderProps {
  resource?: {
    id: string;
    name?: string;
    resource_type: string;
    updated_at?: string;
    created_at?: string;
    path?: PathItem[];
  } | null;
  wide?: boolean;
  onWide?: (wide: boolean) => void;
  showSidebarTrigger?: boolean;
}

export default function ShareHeader({
  resource,
  wide,
  onWide,
  showSidebarTrigger = true,
}: ShareHeaderProps) {
  const { i18n } = useTranslation();
  const { open } = useSidebar();

  const timeText = resource ? getTime(resource as any, i18n) : '';

  return (
    <header className="rounded-[16px] bg-white flex flex-wrap min-h-[48px] shrink-0 items-center gap-2 dark:bg-background">
      <div className="flex flex-1 items-center gap-1 sm:gap-2 px-3">
        {showSidebarTrigger && <SidebarTriggerButton collapse />}
        <ShareBreadcrumb
          path={resource?.path}
          fallbackName={resource?.name}
          className={cn({
            'ml-2': open,
          })}
        />
      </div>
      <div className="ml-auto pr-3 flex items-center gap-2 text-sm">
        {timeText && (
          <div className="hidden font-medium text-muted-foreground md:inline-block">
            {timeText}
          </div>
        )}
        <LanguageToggle />
        <ThemeToggle />
        {resource && (
          <Actions resource={resource} wide={wide} onWide={onWide} />
        )}
      </div>
    </header>
  );
}
