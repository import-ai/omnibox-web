import { Outlet } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar.tsx';
import { MainSidebar } from '@/components/sidebar/main-sidebar.tsx';
import { ResourceProvider } from '@/components/provider/resource-provider.tsx';

export default function NamespaceBase() {
  return (
    <ResourceProvider>
      <SidebarProvider>
        <MainSidebar />
        <Outlet />
      </SidebarProvider>
    </ResourceProvider>
  );
}
