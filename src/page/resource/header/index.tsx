import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';

import Actions, { IActionProps } from '../actions';
import Breadcrumb from './breadcrumb';

export default function Header(props: IActionProps) {
  const { resource, namespaceId } = props;

  return (
    <header className="sticky z-[30] top-0 bg-white flex h-14 shrink-0 items-center gap-2 dark:bg-background">
      <div className="flex flex-1 items-center gap-1 sm:gap-2 px-3">
        <SidebarTrigger />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb namespaceId={namespaceId} resource={resource} />
      </div>
      <div className="ml-auto pr-3">
        <Actions {...props} />
      </div>
    </header>
  );
}
