import { MessageCirclePlus, Search } from 'lucide-react';
import type { ReactNode } from 'react';
import { lazy, Suspense, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Loading from '@/components/loading';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { cn } from '@/lib/utils';

import {
  readSidebarBrowseTab,
  writeSidebarBrowseTab,
} from '../sidebarBrowseState';
import { useSidebarStore } from '../store';
import { ToolbarButton } from './toolbar/Tooltip';

const ChatConversationsPage = lazy(() => import('@/page/chat/conversations'));

interface SidebarBrowseTabsProps {
  namespaceId: string;
  children: ReactNode;
  activeConversationId?: string;
  activeResourceId?: string;
  onConversationSelect: (conversationId: string) => void;
  onSearchConversations: () => void;
  onNewConversation: () => void;
}

export function SidebarBrowseTabs({
  namespaceId,
  children,
  activeConversationId,
  activeResourceId,
  onConversationSelect,
  onSearchConversations,
  onNewConversation,
}: SidebarBrowseTabsProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(() => {
    if (activeConversationId) {
      return 'chats' as const;
    }
    if (activeResourceId) {
      return 'resources' as const;
    }
    return readSidebarBrowseTab(namespaceId);
  });
  const [hasOpenedChats, setHasOpenedChats] = useState(activeTab === 'chats');
  const deselectAll = useSidebarStore(state => state.deselectAll);

  const handleTabChange = (value: string) => {
    if ((value !== 'resources' && value !== 'chats') || value === activeTab) {
      return;
    }
    deselectAll();
    setActiveTab(value);
    writeSidebarBrowseTab(namespaceId, value);
    if (value === 'chats') {
      setHasOpenedChats(true);
    }
  };

  useEffect(() => {
    if (!activeConversationId && !activeResourceId) {
      return;
    }
    const routeTab = activeConversationId ? 'chats' : 'resources';
    deselectAll();
    setActiveTab(routeTab);
    writeSidebarBrowseTab(namespaceId, routeTab);
    if (routeTab === 'chats') {
      setHasOpenedChats(true);
    }
  }, [activeConversationId, activeResourceId, namespaceId, deselectAll]);

  return (
    <Tabs
      value={activeTab}
      onValueChange={handleTabChange}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="sticky top-0 z-10 shrink-0 bg-sidebar">
        <TabsList
          aria-label={`${t('search.resources')} / ${t('search.chats')}`}
          className="relative mx-auto mb-3 mt-2 grid h-7.5 w-sidebar-tabs shrink-0 grid-cols-2 rounded-full bg-sidebar-tab p-0 text-sidebar-tab-foreground"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-full border border-sidebar-tab-border"
          />
          <span
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute inset-y-0 w-sidebar-tab rounded-full bg-sidebar-tab-active shadow-sidebar-tab transition-[left] duration-200 ease-out motion-reduce:transition-none',
              activeTab === 'chats' ? 'left-sidebar-tab-offset' : 'left-0'
            )}
          />
          <TabsTrigger
            value="resources"
            className="relative h-7.5 rounded-full py-0 pl-sidebar-tab-label-inset pr-0 text-sm font-medium leading-none text-sidebar-tab-foreground shadow-none transition-colors data-[state=active]:bg-transparent data-[state=active]:text-sidebar-tab-active-foreground data-[state=active]:shadow-none"
          >
            {t('search.resources')}
          </TabsTrigger>
          <TabsTrigger
            value="chats"
            className="relative h-7.5 rounded-full py-0 pl-0 pr-sidebar-tab-label-inset text-sm font-medium leading-none text-sidebar-tab-foreground shadow-none transition-colors data-[state=active]:bg-transparent data-[state=active]:text-sidebar-tab-active-foreground data-[state=active]:shadow-none"
          >
            {t('search.chats')}
          </TabsTrigger>
        </TabsList>
        {activeTab === 'chats' ? (
          <div className="flex min-h-5 items-center justify-end pl-4 pr-1">
            <div className="flex items-center gap-2">
              <ToolbarButton
                icon={Search}
                onClick={onSearchConversations}
                label={t('search.search_chats')}
              />
              <ToolbarButton
                icon={MessageCirclePlus}
                onClick={onNewConversation}
                label={t('chat.conversations.new_chat')}
              />
            </div>
          </div>
        ) : null}
      </div>
      <TabsContent
        value="resources"
        forceMount
        className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
      >
        {children}
      </TabsContent>
      <TabsContent
        value="chats"
        forceMount
        className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
      >
        {hasOpenedChats && (
          <Suspense fallback={<Loading />}>
            <ChatConversationsPage
              compact
              namespaceId={namespaceId}
              activeConversationId={activeConversationId}
              isSidebarVisible={activeTab === 'chats'}
              onConversationSelect={onConversationSelect}
            />
          </Suspense>
        )}
      </TabsContent>
    </Tabs>
  );
}
