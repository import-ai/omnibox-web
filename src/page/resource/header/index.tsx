import { useTranslation } from 'react-i18next';

import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import Actions, { IActionProps } from '../actions';
import Breadcrumb from './breadcrumb';

export default function Header(props: IActionProps) {
  const { resource, namespaceId } = props;
  const { t } = useTranslation();
  const { open, isMobile } = useSidebar();

  return (
    <header className="rounded-[16px] bg-white flex flex-wrap min-h-[48px] shrink-0 items-center gap-2 dark:bg-background">
      <div className="flex flex-1 items-center gap-1 sm:gap-2 px-3">
        {(!open || isMobile) && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarTrigger className="text-[#8F959E]" />
              </TooltipTrigger>
              <TooltipContent>{t('sidebar.expand')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <Breadcrumb
          namespaceId={namespaceId}
          resource={resource}
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
