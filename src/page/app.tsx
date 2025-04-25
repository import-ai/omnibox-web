import Sidebar from '@/page/sidebar';
import Wrapper from '@/page/wrapper';
import Layout from '@/page/wrapper/layout';
import { SidebarProvider } from '@/components/ui/sidebar.tsx';

export default function CoreApp() {
  return (
    <SidebarProvider>
      <Sidebar />
      <Layout>
        <Wrapper />
      </Layout>
    </SidebarProvider>
  );
}
