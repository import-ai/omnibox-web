import { MessageCirclePlus, Search } from 'lucide-react';
import type { ReactNode } from 'react';
import { lazy, Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Loading from '@/components/loading';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { cn } from '@/lib/utils';

import { ToolbarButton } from './toolbar/Tooltip';

const ChatConversationsPage = lazy(() => import('@/page/chat/conversations'));

interface SidebarBrowseTabsProps {
  namespaceId: string;
  children: ReactNode;
  activeConversationId?: string;
  onConversationSelect: (conversationId: string) => void;
  onSearchConversations: () => void;
  onNewConversation: () => void;
}

export function SidebarBrowseTabs({
  namespaceId,
  children,
  activeConversationId,
  onConversationSelect,
  onSearchConversations,
  onNewConversation,
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
      <div className="sticky top-0 z-10 shrink-0 bg-sidebar">
        <TabsList
          aria-label={`${t('search.resources')} / ${t('search.chats')}`}
          className="relative mx-3 mt-2 mb-1 grid h-[30px] w-[calc(100%-1.5rem)] shrink-0 grid-cols-2 rounded-[30px] bg-[rgba(229,229,229,0.4)] p-0 text-muted-foreground dark:bg-[#171717] dark:text-[#e5e5e5]"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 grid grid-cols-2"
          >
            <span
              className={cn(
                'rounded-[30px] bg-white/80 shadow-[0px_2px_5px_0px_rgba(0,0,0,0.05),0px_-2px_5px_0px_rgba(0,0,0,0.05)] transition-transform duration-200 ease-out motion-reduce:transition-none dark:bg-[#2c2c2c]',
                activeTab === 'chats' && 'translate-x-full'
              )}
            />
          </div>
          <TabsTrigger
            value="resources"
            className="relative h-[30px] rounded-[30px] px-0 py-0 text-sm font-medium leading-[30px] text-muted-foreground shadow-none transition-colors data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
          >
            {t('search.resources')}
          </TabsTrigger>
          <TabsTrigger
            value="chats"
            className="relative h-[30px] rounded-[30px] px-0 py-0 text-sm font-medium leading-[30px] text-muted-foreground shadow-none transition-colors data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
          >
            {t('search.chats')}
          </TabsTrigger>
        </TabsList>
        {activeTab === 'chats' ? (
          <div className="flex min-h-5 items-center justify-end py-1 pl-4 pr-1">
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
              onConversationSelect={onConversationSelect}
            />
          </Suspense>
        )}
      </TabsContent>
    </Tabs>
  );
}
