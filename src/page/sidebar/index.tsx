import React from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Sidebar,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import SettingModal from '@/page/settings';

import { FooterSidebar } from './components/footer';
import { Header } from './components/header';
import { Switcher } from './components/namespace-switcher';
import ResourceTree from './components/resource-tree';
import { useSidebarEvents } from './hooks/use-sidebar-events';
import { useSidebarInit } from './hooks/use-sidebar-init';

export default function MainSidebar() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { setOpenMobile } = useSidebar();
  const { namespaceId, chatPage } = useSidebarInit();
  useSidebarEvents(namespaceId);
  const handleActiveKey = (id: string, edit?: boolean) => {
    if (edit) {
      navigate(`/${namespaceId}/${id}/edit`, { state: { fromSidebar: true } });
    } else if (id === 'chat') {
      navigate(`/${namespaceId}/chat`);
    } else {
      navigate(`/${namespaceId}/${id}`, { state: { fromSidebar: true } });
    }
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <React.Fragment>
      <Sidebar className="border-none">
        <SidebarHeader className="gap-2.5 pr-0 pt-4">
          <Switcher namespaceId={namespaceId} />
          <Header active={chatPage} onActiveKey={handleActiveKey} />
        </SidebarHeader>
        <ResourceTree namespaceId={namespaceId} />
        <FooterSidebar />
        <SidebarRail className="opacity-0" />
      </Sidebar>
      <SettingModal />
    </React.Fragment>
  );
}
