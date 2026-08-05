import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  Sidebar,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from '@/components/ui/Sidebar';
import { useIsMobile } from '@/hooks/useMobile';
import { useCopilotStore } from '@/page/copilot/copilotStore';
import SettingModal from '@/page/settings';

import { BodyForSidebar } from './BodyForSidebar';
import { FooterSidebar } from './components/FooterSidebar';
import { Header } from './components/Header';
import { Switcher } from './components/namespace-switcher';

export default function MainSidebar() {
  const params = useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const resourceId = params.resource_id || '';
  const namespaceId = params.namespace_id || '';
  const { setOpenMobile } = useSidebar();
  const resetCopilot = useCopilotStore(state => state.reset);
  const handleActiveKey = (id: string) => {
    if (id === 'chat' || id === 'chat/conversations') {
      // Leave any citation/resource Copilot split and show the full chat page.
      resetCopilot(namespaceId);
    }
    if (id === 'chat') {
      navigate(`/${namespaceId}/chat`);
    } else {
      navigate(`/${namespaceId}/${id}`);
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
          <Header onActiveKey={handleActiveKey} />
        </SidebarHeader>
        <BodyForSidebar resourceId={resourceId} namespaceId={namespaceId} />
        <FooterSidebar />
        <SidebarRail className="opacity-0" />
      </Sidebar>
      <SettingModal />
    </React.Fragment>
  );
}
