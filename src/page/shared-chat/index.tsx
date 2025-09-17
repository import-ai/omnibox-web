import { Outlet } from 'react-router-dom';

import { SidebarInset } from '@/components/ui/sidebar';

import Header from './header';

export default function SharedChat() {
  return (
    <SidebarInset>
      <Header />
      <Outlet />
    </SidebarInset>
  );
}
