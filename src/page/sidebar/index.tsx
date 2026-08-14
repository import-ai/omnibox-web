import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  Sidebar,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from '@/components/ui/Sidebar';
import useConfig from '@/hooks/useConfig';
import { useIsMobile } from '@/hooks/useMobile';
import useNamespaces from '@/hooks/useNamespaces';
import useProNamespaces from '@/hooks/useProNamespaces';
import {
  getCopilotWorkspace,
  useCopilotStore,
} from '@/page/copilot/copilotStore';
import { navigateToResource } from '@/page/resource/resourceNavigation';
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
  const previewResourceId = useCopilotStore(
    state => getCopilotWorkspace(state, namespaceId).previewResourceId
  );
  const { setOpenMobile } = useSidebar();
  const resetCopilot = useCopilotStore(state => state.reset);
  const { config, loading: configLoading } = useConfig();
  const openSourceNamespaces = useNamespaces({
    disabled: configLoading || config.commercial,
  });
  const proNamespaces = useProNamespaces({
    disabled: configLoading || !config.commercial,
  });
  const namespaces = config.commercial
    ? proNamespaces.data
    : openSourceNamespaces.data;
  const currentProNamespace = proNamespaces.data.find(
    item => item.id === namespaceId
  );
  const handleActiveKey = (id: string) => {
    if (id === 'chat' || id === 'chat/conversations') {
      // Leave any citation/resource Copilot split and show the full chat page.
      resetCopilot(namespaceId);
    }
    if (id === 'chat') {
      navigate(`/${namespaceId}/chat`);
    } else {
      navigateToResource(navigate, `/${namespaceId}/${id}`);
    }
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <React.Fragment>
      <Sidebar className="border-none">
        <SidebarHeader className="gap-2.5 pr-0 pt-4">
          <Switcher namespaceId={namespaceId} namespaces={namespaces} />
          <Header onActiveKey={handleActiveKey} />
        </SidebarHeader>
        <BodyForSidebar
          currentNamespace={currentProNamespace}
          previewResourceId={previewResourceId}
          resourceId={resourceId}
          namespaceId={namespaceId}
        />
        <FooterSidebar
          commercial={configLoading ? undefined : config.commercial}
          currentNamespace={currentProNamespace}
          namespaceId={namespaceId}
        />
        <SidebarRail className="opacity-0" />
      </Sidebar>
      <SettingModal />
    </React.Fragment>
  );
}
