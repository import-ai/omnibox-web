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
          <SidebarTrigger className="text-neutral-400 hover:bg-[#E6E6EC] hover:text-neutral-400 dark:hover:bg-accent" />
        </TooltipTrigger>
        <TooltipContent>
          {t(collapse ? 'sidebar.expand' : 'sidebar.collapse')}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
