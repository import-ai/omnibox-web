import Header from './header';
import Wrapper from './wrapper';
import { cn } from '@/lib/utils';
import useWide from '@/hooks/use-wide';
import useResource from '@/hooks/user-resource';
import { SidebarInset } from '@/components/ui/sidebar';

export default function ResourcePage() {
  const { wide, onWide } = useWide();
  const props = useResource();

  return (
    <SidebarInset>
      <Header {...props} wide={wide} onWide={onWide} />
      <div className="flex justify-center h-full p-4">
        <div
          className={cn('flex flex-col w-full h-full', {
            'max-w-3xl': !wide,
          })}
        >
          <Wrapper {...props} />
        </div>
      </div>
    </SidebarInset>
  );
}
