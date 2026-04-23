import { useTranslation } from 'react-i18next';

import { LanguageToggle } from '@/components/toggle/language';
import { ThemeToggle } from '@/components/toggle/theme';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/tooltip';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { PathItem } from '@/interface';
import { cn } from '@/lib/utils';
import { getTime } from '@/page/resource/utils';

import Actions from './actions';
import ShareBreadcrumb from './breadcrumb';

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
  const { t, i18n } = useTranslation();
  const { open, isMobile } = useSidebar();

  const timeText = resource ? getTime(resource as any, i18n) : '';

  return (
    <header className="flex min-h-[48px] shrink-0 flex-wrap items-center gap-2 rounded-[16px] bg-white dark:bg-background">
      <div className="flex flex-1 items-center gap-1 px-3 sm:gap-2">
        {showSidebarTrigger && (!open || isMobile) && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarTrigger className="text-neutral-400" />
              </TooltipTrigger>
              <TooltipContent>{t('sidebar.expand')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <ShareBreadcrumb
          path={resource?.path}
          fallbackName={resource?.name}
          className={cn({
            'ml-2': open,
          })}
        />
      </div>
      <div className="ml-auto flex items-center gap-2 pr-3 text-sm">
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
