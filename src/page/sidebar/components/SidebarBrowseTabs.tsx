import type { ReactNode } from 'react';
import { lazy, Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Loading from '@/components/loading';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { cn } from '@/lib/utils';

const ChatConversationsPage = lazy(() => import('@/page/chat/conversations'));

interface SidebarBrowseTabsProps {
  namespaceId: string;
  children: ReactNode;
  onConversationSelect: (conversationId: string) => void;
}

export function SidebarBrowseTabs({
  namespaceId,
  children,
  onConversationSelect,
}: SidebarBrowseTabsProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('resources');
  const [hasOpenedChats, setHasOpenedChats] = useState(false);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === 'chats') {
      setHasOpenedChats(true);
    }
  };

  return (
    <Tabs
      value={activeTab}
      onValueChange={handleTabChange}
      className="flex min-h-0 flex-1 flex-col"
    >
      <TabsList
        aria-label={`${t('search.resources')} / ${t('search.chats')}`}
        className="relative mx-3 my-2 grid h-8 shrink-0 grid-cols-2 rounded-full bg-sidebar-accent p-1"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-1 grid grid-cols-2"
        >
          <span
            className={cn(
              'rounded-full bg-background transition-transform duration-200 ease-out motion-reduce:transition-none',
              activeTab === 'chats' && 'translate-x-full'
            )}
          />
        </div>
        <TabsTrigger
          value="resources"
          className="relative rounded-full py-0.5 font-normal transition-colors data-[state=active]:bg-transparent data-[state=active]:shadow-none"
        >
          {t('search.resources')}
        </TabsTrigger>
        <TabsTrigger
          value="chats"
          className="relative rounded-full py-0.5 font-normal transition-colors data-[state=active]:bg-transparent data-[state=active]:shadow-none"
        >
          {t('search.chats')}
        </TabsTrigger>
      </TabsList>
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
              onConversationSelect={onConversationSelect}
            />
          </Suspense>
        )}
      </TabsContent>
    </Tabs>
  );
}
