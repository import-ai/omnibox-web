import { useTranslation } from 'react-i18next';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/tooltip';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

import Actions, { IActionProps } from '../actions';
import Breadcrumb from './breadcrumb';

export default function Header(props: IActionProps) {
  const { resource, namespaceId } = props;
  const { t } = useTranslation();
  const { open, isMobile } = useSidebar();

  return (
    <header className="flex min-h-[48px] shrink-0 flex-wrap items-center gap-2 rounded-[16px] bg-white dark:bg-background">
      <div className="flex flex-1 items-center gap-1 px-3 sm:gap-2">
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
        <Breadcrumb
          namespaceId={namespaceId}
          path={resource?.path}
          className={cn({
            'ml-2': open,
          })}
        />
      </div>
      <div className="ml-auto pr-3">
        <Actions {...props} />
      </div>
    </header>
  );
}
