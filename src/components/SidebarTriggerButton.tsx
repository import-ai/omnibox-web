import { useTranslation } from 'react-i18next';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/tooltip';
import { SidebarTrigger, useSidebar } from '@/components/ui/Sidebar';

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
          <SidebarTrigger className="size-7 text-muted-foreground hover:bg-accent hover:text-foreground dark:hover:bg-accent [&_svg]:size-4" />
        </TooltipTrigger>
        <TooltipContent>
          {t(collapse ? 'sidebar.expand' : 'sidebar.collapse')}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
