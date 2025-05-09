import Page from './page';
import Actions from './actions';
import AuthPage from '@/page/auth';
import { useTranslation } from 'react-i18next';
import { Separator } from '@/components/ui/separator';
import useResource from '@/hooks/user-resource';
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';

export default function ResourcePage() {
  const { t } = useTranslation();
  const { app, resource, resource_id, namespace_id } = useResource();

  return (
    <SidebarInset>
      <header className="flex h-14 shrink-0 items-center gap-2">
        <div className="flex flex-1 items-center gap-2 px-3">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage className="line-clamp-1">
                  {resource && resource.name
                    ? resource.name === 'loading'
                      ? ''
                      : resource.name
                    : t('untitled')}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
        <div className="ml-auto px-3">
          <Actions
            app={app}
            resource={resource}
            namespace_id={namespace_id}
            resource_id={resource_id}
          />
        </div>
      </header>
      <div className="flex justify-center h-full p-4">
        <div className="flex flex-col h-full max-w-3xl w-full">
          <AuthPage namespace_id={namespace_id} resource_id={resource_id}>
            <Page
              app={app}
              resource={resource}
              resource_id={resource_id}
              namespace_id={namespace_id}
            />
          </AuthPage>
        </div>
      </div>
    </SidebarInset>
  );
}
