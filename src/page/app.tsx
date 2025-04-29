import Sidebar from '@/page/sidebar';
import Wrapper from '@/page/wrapper';
import Layout from '@/page/wrapper/layout';
import { SidebarProvider } from '@/components/ui/sidebar.tsx';

export default function CoreApp() {
  // 未登陆不加载页面
  if (!localStorage.getItem('uid')) {
    return null;
  }

  return (
    <SidebarProvider>
      <Sidebar />
      <Layout>{(prop) => <Wrapper {...prop} />}</Layout>
    </SidebarProvider>
  );
}
