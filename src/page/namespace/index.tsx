import Sidebar from '@/page/sidebar';
import { Outlet } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { SearchMenu } from '@/page/search/search';
import { useState } from 'react';

export default function NamespacePage() {
  if (!localStorage.getItem('uid')) {
    return null;
  }

  const [openSearchMenu, setOpenSearchMenu] = useState(false);

  const onSearch = () => {
    setOpenSearchMenu(true);
  };

  return (
    <SidebarProvider>
      <Sidebar onSearch={onSearch} />
      <SearchMenu open={openSearchMenu} onOpenChange={setOpenSearchMenu} />
      <Outlet />
    </SidebarProvider>
  );
}
