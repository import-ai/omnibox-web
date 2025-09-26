import { Separator } from '@/components/ui/separator';
import { SidebarInset, useSidebar } from '@/components/ui/sidebar';
import useWide from '@/hooks/use-wide';
import useResource from '@/hooks/user-resource';
import { cn } from '@/lib/utils';

import Header from './header';
import Wrapper from './wrapper';

export default function ResourcePage() {
  const { wide, onWide } = useWide();
  const props = useResource();
  const { open } = useSidebar();

  return (
    <SidebarInset className="m-[8px] bg-white rounded-[16px]">
      <Header {...props} wide={wide} onWide={onWide} />
      <Separator className="bg-[#F2F2F2]" />
      <div className="flex justify-center h-full p-4">
        <div
          className={cn('flex flex-col w-full h-full', {
            'max-w-[680px]': !wide && open,
            'max-w-[800px]': !wide && !open,
          })}
        >
          <Wrapper {...props} />
        </div>
      </div>
    </SidebarInset>
  );
}
