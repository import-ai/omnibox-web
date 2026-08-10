import { SidebarProvider } from '@/components/ui/Sidebar';
import Workspace from '@/page/copilot/Workspace';
import Sidebar from '@/page/sidebar';
import SidebarStatePersistence from '@/page/sidebar/SidebarStatePersistence';

export default function NamespacePage() {
  if (!localStorage.getItem('uid')) {
    return null;
  }

  return (
    <SidebarProvider>
      <SidebarStatePersistence />
      <Sidebar />
      <Workspace />
    </SidebarProvider>
  );
}
