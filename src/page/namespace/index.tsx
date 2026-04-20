import { Outlet, useParams } from 'react-router-dom';

import { NotificationUnreadProvider } from '@/components/notification/hooks/useNotificationUnread';
import { SidebarProvider } from '@/components/ui/sidebar';
import Sidebar from '@/page/sidebar';

export default function NamespacePage() {
  const params = useParams();
  const namespaceId = params.namespace_id || '';

  if (!localStorage.getItem('uid')) {
    return null;
  }

  return (
    <SidebarProvider>
      <NotificationUnreadProvider key={namespaceId}>
        <Sidebar />
        <Outlet />
      </NotificationUnreadProvider>
    </SidebarProvider>
  );
}
