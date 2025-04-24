import Render from '@/page/resource/render';
import Editor from '@/page/resource/editor';
import { useState, useEffect } from 'react';
import Actions from '@/page/resource/actions';
import useResource from '@/hooks/user-resource';
import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import 'vditor/dist/index.css';
import '@/styles/vditor-patch.css';

export default function ResourcePage() {
  const [open, onOpen] = useState(true);
  const { app, resource, onResource } = useResource();

  useEffect(() => {
    return app.on('resource_children', onOpen);
  }, []);

  if (!resource) {
    return null;
  }

  return (
    <>
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2">
          <div className="flex flex-1 items-center gap-2 px-3">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage className="line-clamp-1">
                    {resource.name || 'Untitled'}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="ml-auto px-3">
            <Actions />
          </div>
        </header>
        <div className="flex justify-center h-full p-4">
          <div className="flex flex-col h-full max-w-3xl w-full">
            {open ? (
              <Render
                content={`# ${resource.name || 'Untitled'}\n${
                  resource.content || ''
                }`}
              />
            ) : (
              <Editor app={app} resource={resource} onResource={onResource} />
            )}
          </div>
        </div>
      </SidebarInset>
    </>
  );
}
