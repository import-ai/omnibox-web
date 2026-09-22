import { MessageCircle, MoreHorizontal, SquarePen, Trash2 } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import Loading from '@/components/loading';
import Pagination from '@/components/pagination';
import { Button } from '@/components/ui/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { Separator } from '@/components/ui/Separator';
import {
  SidebarContent,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/Sidebar';
import { useIsTouch } from '@/hooks/useIsTouch';
import { cn } from '@/lib/utils';
import UnauthorizedPage from '@/page/auth/UnauthorizedPage';
import { navigateToResource } from '@/page/resource/resourceNavigation';
import {
  menuIconClass,
  menuItemClass,
} from '@/page/sidebar/components/resource-tree/shared';
import { centerSidebarElement } from '@/page/sidebar/sidebarScroll';

import { groupItemsByTimestamp } from '../utils';
import ConversationLoadMore from './ConversationLoadMore';
import EditHistory from './edit';
import RemoveHistory from './RemoveHistory';
import useContext from './useContext';

interface ChatConversationsPageProps {
  compact?: boolean;
  namespaceId?: string;
  activeConversationId?: string;
  isSidebarVisible?: boolean;
  onConversationSelect?: (conversationId: string) => void;
}

export default function ChatConversationsPage({
  compact = false,
  namespaceId: namespaceIdOverride,
  activeConversationId,
  isSidebarVisible = true,
  onConversationSelect,
}: ChatConversationsPageProps = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const isTouch = useIsTouch();
  const {
    list: {
      data,
      current,
      pageSize,
      loading,
      accessDenied,
      hasLoadError,
      hasMore,
      refetch,
      onPagerChange,
    },
    edit,
    onEdit,
    remove,
    onRemove,
    onEditDone,
    namespaceId,
    onEditChange,
    onRemoveDone,
    onRemoveChange,
  } = useContext(namespaceIdOverride, compact);

  const handleLoadMore = () => onPagerChange(current + 1);
  const activeConversationRef = useRef<HTMLDivElement>(null);
  const locatedConversationRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!compact || !isSidebarVisible || !activeConversationId) {
      locatedConversationRef.current = undefined;
      return;
    }
    if (location.state?.fromSidebar === true) {
      locatedConversationRef.current = activeConversationId;
      navigate(location.pathname, {
        replace: true,
        state: { ...location.state, fromSidebar: undefined },
      });
      return;
    }
    if (locatedConversationRef.current === activeConversationId) {
      return;
    }
    if (activeConversationRef.current) {
      const row = activeConversationRef.current;
      const scrollContainer = row.closest<HTMLElement>(
        '[data-sidebar="content"]'
      );
      if (scrollContainer && hasMore && !hasLoadError) {
        const rowBounds = row.getBoundingClientRect();
        const containerBounds = scrollContainer.getBoundingClientRect();
        const rowCenter =
          rowBounds.top -
          containerBounds.top +
          scrollContainer.scrollTop +
          rowBounds.height / 2;
        const remainingHeight = scrollContainer.scrollHeight - rowCenter;
        if (remainingHeight < scrollContainer.clientHeight / 2) {
          if (!loading) {
            onPagerChange(current + 1);
          }
          return;
        }
      }
      const controller = new AbortController();
      centerSidebarElement(
        `[data-conversation-id="${CSS.escape(activeConversationId)}"]`,
        { options: { signal: controller.signal } }
      ).then(() => {
        if (!controller.signal.aborted) {
          locatedConversationRef.current = activeConversationId;
        }
      });
      return () => controller.abort();
    } else if (!loading && !hasLoadError && hasMore) {
      onPagerChange(current + 1);
    }
  }, [
    compact,
    isSidebarVisible,
    activeConversationId,
    data,
    loading,
    hasLoadError,
    hasMore,
    current,
    onPagerChange,
    location.pathname,
    location.state,
    navigate,
  ]);

  if (accessDenied) {
    return <UnauthorizedPage />;
  }

  const dialogs = (
    <>
      <EditHistory
        data={edit}
        onFinish={onEditDone}
        namespaceId={namespaceId}
        onOpenChange={onEditChange}
      />
      <RemoveHistory
        data={remove}
        onFinish={onRemoveDone}
        namespaceId={namespaceId}
        onOpenChange={onRemoveChange}
      />
    </>
  );

  if (compact) {
    return (
      <>
        {dialogs}
        <SidebarContent className="no-scrollbar gap-0 overflow-x-hidden p-2 pr-0">
          {loading && data.data.length === 0 ? (
            <Loading />
          ) : data.data.length > 0 ? (
            <>
              {groupItemsByTimestamp(data.data, i18n).map(([key, items]) => (
                <div key={key} className="pb-1">
                  <div className="flex h-8 items-center px-2">
                    <p className="text-xs font-normal leading-8 text-[#8F959E]">
                      {key}
                    </p>
                  </div>
                  <SidebarMenu className="gap-0.5">
                    {items.map(item => {
                      const conversationTitle: string =
                        item.title ||
                        item.user_content ||
                        t('chat.conversations.new');
                      const isActive = activeConversationId === item.id;
                      return (
                        <SidebarMenuItem
                          key={item.id}
                          className="group/sidebar-item"
                        >
                          <div
                            className={cn(
                              'group/sidebar-item relative my-px rounded-md hover:bg-sidebar-accent',
                              isActive &&
                                'bg-[#E2E2E6] hover:bg-[#E2E2E6] dark:bg-[#363637]'
                            )}
                          >
                            <SidebarMenuButton
                              asChild
                              className={cn(
                                'h-auto gap-1 py-1.5 transition-none bg-transparent group-has-[[data-sidebar=menu-action]]/menu-item:pr-1 data-[active=true]:font-normal data-[active=true]:bg-transparent dark:data-[active=true]:bg-transparent hover:bg-transparent',
                                'group-hover/sidebar-item:!pr-[30px]'
                              )}
                            >
                              <div
                                ref={
                                  isActive ? activeConversationRef : undefined
                                }
                                data-conversation-id={item.id}
                                className="flex cursor-pointer items-center gap-1 pl-4"
                                onClick={() => {
                                  if (onConversationSelect) {
                                    onConversationSelect(item.id);
                                  } else {
                                    navigateToResource(
                                      navigate,
                                      `/${namespaceId}/chat/${item.id}`,
                                      { state: { fromSidebar: true } }
                                    );
                                  }
                                }}
                              >
                                <MessageCircle className="size-4 shrink-0 text-primary" />
                                <span className="flex-1 truncate text-sm font-normal leading-5 text-primary">
                                  {conversationTitle}
                                </span>
                              </div>
                            </SidebarMenuButton>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <SidebarMenuAction
                                  asChild
                                  className={cn(
                                    'right-2 size-4 cursor-pointer !text-neutral-400 hover:bg-transparent hover:!text-sidebar-foreground focus-visible:outline-none focus-visible:ring-transparent peer-data-[size=default]/menu-button:top-2',
                                    isTouch
                                      ? 'pointer-events-auto opacity-100'
                                      : 'pointer-events-none opacity-0 group-hover/sidebar-item:pointer-events-auto group-hover/sidebar-item:opacity-100'
                                  )}
                                >
                                  <MoreHorizontal className="cursor-pointer focus-visible:outline-none focus-visible:ring-transparent" />
                                </SidebarMenuAction>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                side="right"
                                align="start"
                                sideOffset={10}
                              >
                                <DropdownMenuItem
                                  className={menuItemClass}
                                  onClick={event => {
                                    event.stopPropagation();
                                    onEdit({
                                      id: item.id,
                                      title: conversationTitle,
                                      open: true,
                                    });
                                  }}
                                >
                                  <SquarePen className={menuIconClass} />
                                  {t('chat.conversations.rename.option')}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="group cursor-pointer gap-2 data-[highlighted]:text-destructive"
                                  onClick={event => {
                                    event.stopPropagation();
                                    onRemove({
                                      id: item.id,
                                      title: conversationTitle,
                                      open: true,
                                    });
                                  }}
                                >
                                  <Trash2 className="size-4 text-neutral-500 group-hover:text-destructive dark:text-[#a1a1a1]" />
                                  {t('chat.conversations.delete.option')}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </div>
              ))}
              <ConversationLoadMore
                hasMore={hasMore}
                loading={loading}
                hasError={hasLoadError}
                onLoadMore={handleLoadMore}
              />
            </>
          ) : hasLoadError ? (
            <ConversationLoadMore
              hasMore={false}
              loading={loading}
              hasError={hasLoadError}
              onLoadMore={refetch}
            />
          ) : (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              {t('chat.conversations.empty')}
            </p>
          )}
        </SidebarContent>
      </>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 justify-center overflow-auto p-4">
      <div className="flex flex-col h-full max-w-3xl w-full">
        {dialogs}
        <div className="mb-6">
          <h1 className="text-2xl font-medium">
            {t('chat.conversations.history')}
          </h1>
        </div>
        {loading ? (
          <Loading />
        ) : (
          <div className="space-y-6">
            {data.data.length > 0 ? (
              <>
                {groupItemsByTimestamp(data.data, i18n).map(([key, items]) => (
                  <div key={key}>
                    <div className="pb-4">
                      <p className="text-sm text-muted-foreground font-light ml-0.5">
                        {key}
                      </p>
                    </div>
                    {items.map((item, index) => {
                      const conversationTitle: string =
                        item.title ||
                        item.user_content ||
                        t('chat.conversations.new');
                      return (
                        <div
                          className="cursor-pointer group"
                          key={item.id}
                          onClick={() => {
                            if (onConversationSelect) {
                              onConversationSelect(item.id);
                            } else {
                              navigateToResource(
                                navigate,
                                `/${namespaceId}/chat/${item.id}`
                              );
                            }
                          }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="line-clamp-2 text-lg font-medium group-hover:text-blue-500">
                              {conversationTitle}
                            </h3>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="icon" variant="ghost">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent side="bottom" align="end">
                                <DropdownMenuItem
                                  className="cursor-pointer"
                                  onClick={event => {
                                    event.stopPropagation();
                                    onEdit({
                                      id: item.id,
                                      title: conversationTitle,
                                      open: true,
                                    });
                                  }}
                                >
                                  {t('rename')}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="cursor-pointer hover:text-red-500 focus:text-red-500 data-[highlighted]:text-red-500"
                                  onClick={event => {
                                    event.stopPropagation();
                                    onRemove({
                                      id: item.id,
                                      title: conversationTitle,
                                      open: true,
                                    });
                                  }}
                                >
                                  {t('delete')}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <p className="text-muted-foreground text-sm line-clamp-2 leading-relaxed">
                            {item.assistant_content?.replace(
                              /\[\[\d+]]/g,
                              ''
                            ) || '...'}
                          </p>
                          {index < items.length - 1 && (
                            <Separator className="my-4" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
                <Pagination
                  total={data.total}
                  current={current}
                  pageSize={pageSize}
                  onChange={onPagerChange}
                />
              </>
            ) : (
              <div className="text-gray-500">
                <p>{t('chat.conversations.empty')}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
