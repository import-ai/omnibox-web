import { Outlet } from 'react-router-dom';

import { SidebarInset } from '@/components/ui/sidebar';

export default function SharedChat() {
  return (
    <SidebarInset>
      <Outlet />
    </SidebarInset>
  );
}
