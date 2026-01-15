import { useEffect, useRef, useState } from 'react';

import { Separator } from '@/components/ui/separator';
import { SidebarInset, useSidebar } from '@/components/ui/sidebar';
import useApp from '@/hooks/use-app';
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
  const app = useApp();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleSize() {
      onLarge(window.innerWidth > 1500);
    }
    window.addEventListener('resize', handleSize);
    return () => {
      window.removeEventListener('resize', handleSize);
    };
  }, []);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const scrollThreshold = 100;

      if (scrollHeight - scrollTop - clientHeight < scrollThreshold) {
        app.fire('scroll-to-bottom');
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll);

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, [app]);

  return (
    <SidebarInset className="m-[8px] bg-white rounded-[16px] dark:bg-background min-h-0 h-full md:h-[calc(100svh-16px)]">
      <Header {...props} wide={wide} onWide={onWide} />
      <Separator className="bg-[#F2F2F2] dark:bg-[#303132]" />
      <div
        ref={scrollContainerRef}
        className="flex flex-1 justify-center p-4 overflow-auto"
      >
        <div
          className={cn('flex flex-col w-full', {
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
