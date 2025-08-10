import { Outlet } from 'react-router-dom';

import { SidebarProvider } from '@/components/ui/sidebar';
import Sidebar from '@/page/sidebar';

export default function NamespacePage() {
  if (!localStorage.getItem('uid')) {
    return null;
  }

  return (
    <SidebarProvider>
      <Sidebar />
      <Outlet />
    </SidebarProvider>
  );
}
