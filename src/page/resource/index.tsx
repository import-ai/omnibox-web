import { cn } from '@/lib/utils';
import Actions from './actions';
import Wrapper from './wrapper';
import useWide from '@/hooks/use-wide';
import { useTranslation } from 'react-i18next';
import useResource from '@/hooks/user-resource';
import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';

export default function ResourcePage() {
  const { t } = useTranslation();
  const { wide, onWide } = useWide();
  const { app, loading, forbidden, resource, resource_id, namespace_id } =
    useResource();

  return (
    <SidebarInset>
      <header className="sticky top-0 bg-white flex h-14 shrink-0 items-center gap-2 dark:bg-background">
        <div className="flex flex-1 items-center gap-1 sm:gap-2 px-3">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage className="line-clamp-1">
                  {loading ? '' : resource ? resource.name : t('untitled')}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className="ml-auto pr-3">
          <Actions
            app={app}
            wide={wide}
            onWide={onWide}
            forbidden={forbidden}
            resource={resource}
          />
        </div>
      </header>
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
            resource_id={resource_id}
            namespace_id={namespace_id}
          />
        </div>
      </div>
    </SidebarInset>
  );
}
