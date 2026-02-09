import { useTranslation } from 'react-i18next';

import { LanguageToggle } from '@/components/toggle/language';
import { ThemeToggle } from '@/components/toggle/theme';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getTime } from '@/page/resource/utils';

import Actions from './actions';

interface ShareHeaderProps {
  resource?: {
    id: string;
    name?: string;
    resource_type: string;
    updated_at?: string;
    created_at?: string;
  } | null;
  wide?: boolean;
  onWide?: (wide: boolean) => void;
  shareId?: string;
}

export default function ShareHeader({
  resource,
  wide,
  onWide,
  shareId,
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
        <span
          className="truncate font-normal text-sm max-w-[240px] pl-4"
          title={resource?.name || t('untitled')}
        >
          {resource?.name || t('untitled')}
        </span>
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
          <Actions
            resource={resource}
            wide={wide}
            onWide={onWide}
            shareId={shareId}
          />
        )}
      </div>
    </header>
  );
}
