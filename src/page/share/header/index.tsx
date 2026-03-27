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
}

export default function ShareHeader({
  resource,
  wide,
  onWide,
}: ShareHeaderProps) {
  const { t, i18n } = useTranslation();
  const { open, isMobile } = useSidebar();

  const timeText = resource ? getTime(resource as any, i18n) : '';

  return (
    <header className="rounded-[16px] bg-white flex flex-wrap min-h-[48px] shrink-0 items-center gap-2 dark:bg-background">
      <div className="flex flex-1 items-center gap-1 sm:gap-2 px-3">
        {(!open || isMobile) && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarTrigger className="text-neutral-400" />
              </TooltipTrigger>
              <TooltipContent>{t('sidebar.expand')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {resource?.path && resource.path.length > 1 ? (
          <ShareBreadcrumb
            path={resource.path}
            className={cn({
              'ml-2': open,
            })}
          />
        ) : (
          <span
            className={cn('truncate font-normal text-sm max-w-[240px]', {
              'ml-2': open,
            })}
            title={resource?.name || t('untitled')}
          >
            {resource?.name || t('untitled')}
          </span>
        )}
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
