import Header from './header';
import Wrapper from './wrapper';
import { cn } from '@/lib/utils';
import useWide from '@/hooks/use-wide';
import useResource from '@/hooks/user-resource';
import { SidebarInset } from '@/components/ui/sidebar';

export default function ResourcePage() {
  const { wide, onWide } = useWide();
  const { app, loading, forbidden, resource, resourceId, namespaceId } =
    useResource();

  return (
    <SidebarInset>
      <Header
        app={app}
        wide={wide}
        onWide={onWide}
        resource={resource}
        forbidden={forbidden}
      />
      <div className="flex justify-center h-full p-4">
        <div
          className={cn('flex flex-col h-full  w-full', {
            'max-w-3xl': !wide,
            'w-full': wide,
          })}
        >
          <Wrapper
            app={app}
            loading={loading}
            resource={resource}
            forbidden={forbidden}
            resourceId={resourceId}
            namespaceId={namespaceId}
          />
        </div>
      </div>
    </SidebarInset>
  );
}
