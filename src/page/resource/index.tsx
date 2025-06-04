import Actions from './actions';
import Wrapper from './wrapper';
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
  const { app, loading, forbidden, resource, resource_id, namespace_id } =
    useResource();

  return (
    <SidebarInset>
      <header className="sticky top-0 bg-white flex h-14 shrink-0 items-center gap-2 dark:bg-background">
        <div className="flex flex-1 items-center gap-2 px-3">
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
        <div className="ml-auto px-3">
          <Actions app={app} forbidden={forbidden} resource={resource} />
        </div>
      </header>
      <div className="flex justify-center h-full p-4">
        <div className="flex flex-col h-full max-w-3xl w-full">
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
