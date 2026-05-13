import { SidebarTriggerButton } from '@/components/sidebarTrigger';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

import Actions, { IActionProps } from '../actions';
import Breadcrumb from './breadcrumb';

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
      <div className="ml-auto pr-3">
        <Actions {...props} />
      </div>
    </header>
  );
}
