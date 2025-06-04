import Title from './title';
import Actions from './actions';
import { useParams, useLocation } from 'react-router-dom';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
} from '@/components/ui/breadcrumb';

export default function ChatHeader() {
  const params = useParams();
  const loc = useLocation();
  const namespaceId = params.namespace_id || '';
  const conversationPage = !!params.conversation_id;
  const conversationsPage = loc.pathname.endsWith('/chat/conversations');
  const homePage = !conversationPage && !conversationsPage;

  return (
    <header className="sticky top-0 bg-white flex h-14 shrink-0 items-center gap-2 dark:bg-background">
      <div className="flex flex-1 items-center gap-2 px-3">
        <SidebarTrigger />
        {!conversationsPage && (
          <>
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <Title />
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </>
        )}
      </div>
      <div className="ml-auto px-3">
        <Actions
          homePage={homePage}
          namespaceId={namespaceId}
          conversationPage={conversationPage}
          conversationsPage={conversationsPage}
        />
      </div>
    </header>
  );
}
