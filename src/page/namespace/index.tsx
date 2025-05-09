import Sidebar from '@/page/sidebar';
import { Outlet } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar.tsx';

export default function NamespacePage() {
  // 未登陆不加载页面
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
