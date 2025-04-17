import Sidebar from './sidebar';
import Resource from '@/page/resource';
import { SidebarProvider } from '@/components/ui/sidebar.tsx';

export default function Namespace() {
  return (
    <SidebarProvider>
      <Sidebar />
      <Resource />
    </SidebarProvider>
  );
}
