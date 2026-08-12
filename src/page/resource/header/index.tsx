import { SidebarTriggerButton } from '@/components/SidebarTriggerButton';
import { useSidebar } from '@/components/ui/Sidebar';
import { cn } from '@/lib/utils';
import CopilotToggleButton from '@/page/copilot/CopilotToggleButton';

import Actions, { IActionProps } from '../actions';
import Breadcrumb from './BreadcrumbMain';

export default function Header(props: IActionProps) {
  const { resource, namespaceId } = props;
  const { open } = useSidebar();

  return (
    <header className="rounded-[16px] bg-white flex flex-wrap min-h-[48px] shrink-0 items-center gap-2 dark:bg-background">
      <div className="flex flex-1 items-center gap-1 sm:gap-2 px-3">
        <SidebarTriggerButton collapse />
        <Breadcrumb
          namespaceId={namespaceId}
          path={resource?.path}
          className={cn({
            'ml-2': open,
          })}
        />
      </div>
      <div className="ml-auto flex items-center gap-1 pr-3">
        <Actions {...props} />
        {resource && (
          <CopilotToggleButton hideWhenOpen namespaceId={namespaceId} />
        )}
      </div>
    </header>
  );
}
