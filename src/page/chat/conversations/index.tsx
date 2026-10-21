import { MessageCircle, MoreHorizontal, SquarePen, Trash } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import { Button } from '@/components/Button';
import Loading from '@/components/loading';
import { sidebarToolbarIconButtonClassName } from '@/components/omnibox/IconButton';
import Pagination from '@/components/pagination';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { Separator } from '@/components/ui/Separator';
import {
  SidebarContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/Sidebar';
import { useIsTouch } from '@/hooks/useIsTouch';
import { cn } from '@/lib/utils';
import UnauthorizedPage from '@/page/auth/UnauthorizedPage';
import { navigateToResource } from '@/page/resource/resourceNavigation';
import { useMenuTriggerPress } from '@/page/sidebar/components/resource-tree/menuTriggerPress';
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
  onBindRefresh?: (refresh: (() => Promise<void>) | null) => void;
}

export default function ChatConversationsPage({
  compact = false,
  namespaceId: namespaceIdOverride,
  activeConversationId,
  isSidebarVisible = true,
  onConversationSelect,
  onBindRefresh,
}: ChatConversationsPageProps = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const isTouch = useIsTouch();
  const menuTriggerPress = useMenuTriggerPress();
  const {
    list: {
      data,
      current,
      pageSize,
      loading,
      loadingMore,
      accessDenied,
      hasLoadError,
      hasMore,
      refetch,
      retry,
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

  useLayoutEffect(() => {
    if (!onBindRefresh) {
      return;
    }
    onBindRefresh(() => refetch());
    return () => onBindRefresh(null);
  }, [onBindRefresh, refetch]);
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
        <SidebarContent className="no-scrollbar gap-0 overflow-x-hidden p-2 md:pr-0">
          {loading && data.data.length === 0 ? (
            <Loading />
          ) : data.data.length > 0 ? (
            <>
              {groupItemsByTimestamp(data.data, i18n).map(([key, items]) => (
                <div key={key}>
                  <SidebarGroupLabel className="h-(--sidebar-row-height) px-4 font-normal text-muted-foreground">
                    {key}
                  </SidebarGroupLabel>
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
                              'flex items-center',
                              isActive &&
                                'bg-sidebar-accent text-sidebar-accent-foreground'
                            )}
                          >
                            <SidebarMenuButton
                              asChild
                              className={cn(
                                'h-(--sidebar-row-height) gap-1 py-0 transition-none bg-transparent group-has-data-[sidebar=menu-action]/menu-item:pr-1 data-[active=true]:font-normal data-[active=true]:bg-transparent dark:data-[active=true]:bg-transparent hover:bg-transparent',
                                'group-hover/sidebar-item:pr-[30px]!'
                              )}
                            >
                              <div
                                ref={
                                  isActive ? activeConversationRef : undefined
                                }
                                data-conversation-id={item.id}
                                className="flex cursor-pointer items-center pl-7"
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
                                <MessageCircle className="size-4 shrink-0" />
                                <span className="flex-1 truncate text-sm font-normal leading-5">
                                  {conversationTitle}
                                </span>
                              </div>
                            </SidebarMenuButton>
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                asChild
                                {...menuTriggerPress.triggerProps}
                              >
                                <SidebarMenuAction
                                  asChild
                                  className={cn(
                                    sidebarToolbarIconButtonClassName,
                                    'right-2 size-4 cursor-pointer focus-visible:outline-hidden focus-visible:ring-transparent peer-data-[size=default]/menu-button:top-1/2 -translate-y-1/2 active:translate-y-[calc(-50%+1px)] select-none',
                                    isTouch
                                      ? 'pointer-events-auto opacity-100'
                                      : 'pointer-events-none opacity-0 group-hover/sidebar-item:pointer-events-auto group-hover/sidebar-item:opacity-100'
                                  )}
                                >
                                  <button type="button">
                                    <MoreHorizontal />
                                  </button>
                                </SidebarMenuAction>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                side="right"
                                align="start"
                                sideOffset={10}
                                {...menuTriggerPress.contentProps}
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
                                  variant="destructive"
                                  className={menuItemClass}
                                  onClick={event => {
                                    event.stopPropagation();
                                    onRemove({
                                      id: item.id,
                                      title: conversationTitle,
                                      open: true,
                                    });
                                  }}
                                >
                                  <Trash className={menuIconClass} />
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
                loading={loadingMore}
                hasError={hasLoadError}
                onLoadMore={hasLoadError ? retry : handleLoadMore}
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
                              <DropdownMenuTrigger
                                asChild
                                {...menuTriggerPress.triggerProps}
                              >
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className={sidebarToolbarIconButtonClassName}
                                >
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                side="bottom"
                                align="end"
                                className="w-auto! min-w-36"
                                {...menuTriggerPress.contentProps}
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
                                  {t('rename')}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  variant="destructive"
                                  className={menuItemClass}
                                  onClick={event => {
                                    event.stopPropagation();
                                    onRemove({
                                      id: item.id,
                                      title: conversationTitle,
                                      open: true,
                                    });
                                  }}
                                >
                                  <Trash className={menuIconClass} />
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
              <div className="text-muted-foreground">
                <p>{t('chat.conversations.empty')}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
