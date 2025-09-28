import { useEffect, useState } from 'react';

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
  const [large, onLarge] = useState(window.innerWidth > 1500);

  useEffect(() => {
    function handleSize() {
      onLarge(window.innerWidth > 1500);
    }
    window.addEventListener('resize', handleSize);
    return () => {
      window.removeEventListener('resize', handleSize);
    };
  }, []);

  return (
    <SidebarInset className="m-[8px] bg-white rounded-[16px] dark:bg-background">
      <Header {...props} wide={wide} onWide={onWide} />
      <Separator className="bg-[#F2F2F2] dark:bg-[#303132]" />
      <div className="flex justify-center h-full p-4">
        <div
          className={cn('flex flex-col w-full h-full', {
            'max-w-[680px]': !wide && (open || !large),
            'max-w-[800px]': !wide && (!open || large),
          })}
        >
          <Wrapper {...props} />
        </div>
      </div>
    </SidebarInset>
  );
}
