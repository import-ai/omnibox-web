import React, { useState } from 'react';
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
import { resetChatForNamespaceSwitch } from '@/lib/chatBridge';
import { clearChatInputDraft } from '@/page/chat/chat-input/chatInputDraft';
import ConversationSearchDialog from '@/page/chat/conversations/ConversationSearchDialog';
import {
  getCopilotWorkspace,
  useCopilotStore,
} from '@/page/copilot/copilotStore';
import { navigateToResource } from '@/page/resource/resourceNavigation';
import SearchMenu from '@/page/search';
import SettingModal from '@/page/settings';

import { BodyForSidebar } from './BodyForSidebar';
import { FooterSidebar } from './components/FooterSidebar';
import { Header } from './components/Header';
import { Switcher } from './components/namespace-switcher';
import { SidebarBrowseTabs } from './components/SidebarBrowseTabs';

export default function MainSidebar() {
  const params = useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const resourceId = params.resource_id || '';
  const namespaceId = params.namespace_id || '';
  const conversationId = params.conversation_id || '';
  const [resourceSearchOpen, setResourceSearchOpen] = useState(false);
  const [conversationSearchOpen, setConversationSearchOpen] = useState(false);
  const previewResourceId = useCopilotStore(
    state => getCopilotWorkspace(state, namespaceId).previewResourceId
  );
  const { setOpenMobile } = useSidebar();
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
    // Do not reset Copilot before navigate: history is lazy, and clearing the
    // citation split first lets the conversation Outlet jump into the resource pane.
    // Chat/history still go through navigateToResource so an in-flight warm is
    // cancelled before React Router updates the URL.
    navigateToResource(navigate, `/${namespaceId}/${id}`);
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const handleNewConversation = () => {
    if (conversationId) clearChatInputDraft(conversationId);
    resetChatForNamespaceSwitch(namespaceId);
    handleActiveKey('chat');
  };
  const handleConversationSelect = (conversationId: string) => {
    handleActiveKey(`chat/${conversationId}`);
  };
  const handleSidebarConversationSelect = (conversationId: string) => {
    navigateToResource(navigate, `/${namespaceId}/chat/${conversationId}`, {
      state: { fromSidebar: true },
    });
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <React.Fragment>
      <Sidebar className="border-none">
        <SidebarHeader className="gap-2.5 pr-0 pt-4">
          <Switcher
            commercial={configLoading ? undefined : config.commercial}
            namespaceId={namespaceId}
            namespaces={namespaces}
          />
          <Header
            onActiveKey={handleActiveKey}
            onSearch={() => setResourceSearchOpen(true)}
          />
        </SidebarHeader>
        <SidebarBrowseTabs
          key={namespaceId}
          namespaceId={namespaceId}
          activeConversationId={conversationId}
          activeResourceId={resourceId}
          onConversationSelect={handleSidebarConversationSelect}
          onSearchConversations={() => setConversationSearchOpen(true)}
          onNewConversation={handleNewConversation}
        >
          <BodyForSidebar
            currentNamespace={currentProNamespace}
            previewResourceId={previewResourceId}
            resourceId={resourceId}
            namespaceId={namespaceId}
            onSearchResources={() => setResourceSearchOpen(true)}
          />
        </SidebarBrowseTabs>
        <FooterSidebar
          commercial={configLoading ? undefined : config.commercial}
          currentNamespace={currentProNamespace}
          namespaceId={namespaceId}
        />
        <SidebarRail className="opacity-0" />
      </Sidebar>
      <SettingModal />
      <SearchMenu
        open={resourceSearchOpen}
        onOpenChange={setResourceSearchOpen}
      />
      <ConversationSearchDialog
        namespaceId={namespaceId}
        open={conversationSearchOpen}
        onOpenChange={setConversationSearchOpen}
        onConversationSelect={handleConversationSelect}
      />
    </React.Fragment>
  );
}
