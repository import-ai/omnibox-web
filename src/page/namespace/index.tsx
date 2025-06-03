import Sidebar from '@/page/sidebar';
import { Outlet } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { SearchMenu } from '@/page/search/search';

export default function NamespacePage() {
  // 未登陆不加载页面
  if (!localStorage.getItem('uid')) {
    return null;
  }

  return (
    <SidebarProvider>
      <Sidebar />
      <SearchMenu />
      <Outlet />
    </SidebarProvider>
  );
}
