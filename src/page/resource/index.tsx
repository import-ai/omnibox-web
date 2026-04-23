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
    <SidebarInset className="m-[8px] h-full min-h-0 min-w-0 overflow-hidden rounded-[16px] bg-white dark:bg-background md:h-[calc(100svh-16px)]">
      <Header {...props} wide={wide} onWide={onWide} />
      <Separator className="bg-[#F2F2F2] dark:bg-[#303132]" />
      <div
        ref={scrollContainerRef}
        className="flex min-w-0 flex-1 justify-center overflow-y-auto overflow-x-hidden p-4"
      >
        <div
          className={cn('flex w-full min-w-0 max-w-full flex-col', {
            'max-w-[680px]': !wide && (open || !large),
            'max-w-[800px]': !wide && (!open || large),
            'max-w-7xl': wide,
          })}
        >
          <Wrapper {...props} />
        </div>
      </div>
    </SidebarInset>
  );
}
