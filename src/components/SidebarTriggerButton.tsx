import { useTranslation } from 'react-i18next';

import { sidebarToolbarIconButtonClassName } from '@/components/omnibox/IconButton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/tooltip';
import { SidebarTrigger, useSidebar } from '@/components/ui/Sidebar';
import { cn } from '@/lib/utils';

interface IProps {
  collapse: boolean;
}

export function SidebarTriggerButton({ collapse }: IProps) {
  const { open, isMobile } = useSidebar();
  const { t } = useTranslation();
  const condition = open && !isMobile;
  const hidden = collapse ? condition : !condition;

  if (hidden) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <SidebarTrigger
            className={cn(
              sidebarToolbarIconButtonClassName,
              'size-7 [&_svg]:size-4'
            )}
          />
        </TooltipTrigger>
        <TooltipContent>
          {t(collapse ? 'sidebar.expand' : 'sidebar.collapse')}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
