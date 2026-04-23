import { Bell, BellDot, History, Search } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

import { ChatIcon } from '@/assets/icons/chatIcon';
import ActionDialog from '@/components/invite-dialog/action-dialog';
import Notification from '@/components/notification';
import { useNotificationUnreadCount } from '@/components/notification/hooks/useNotifications';
import { notificationDialogContentClassName } from '@/components/notification/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/tooltip';
import { Button } from '@/components/ui/button';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useIsTouch } from '@/hooks/use-is-touch';
import { cn } from '@/lib/utils';
import SearchMenu from '@/page/search';

interface IProps {
  onActiveKey: (activeKey: string, edit?: boolean) => void;
}

export function Header(props: IProps) {
  const { onActiveKey } = props;
  const active = useLocation().pathname.includes('/chat');
  const [search, setSearch] = useState(false);
  const { t } = useTranslation();
  const isTouch = useIsTouch();
  const unreadCount = useNotificationUnreadCount();
  const onChat = () => {
    onActiveKey('chat');
  };
  const onSearch = () => {
    setSearch(true);
  };
  const onChatHistory = () => {
    onActiveKey('chat/conversations');
  };

  return (
    <>
      <SearchMenu open={search} onOpenChange={setSearch} />
      <SidebarMenu className="mb-4">
        <SidebarMenuItem className="group/chat">
          <SidebarMenuButton
            asChild
            isActive={active}
            className="h-auto py-1.5 pr-1"
          >
            <div
              className="flex cursor-pointer items-center gap-2"
              onClick={onChat}
            >
              <ChatIcon className="size-4" />
              <span className="font-normal">{t('chat.title')}</span>
            </div>
          </SidebarMenuButton>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={onChatHistory}
                  className={cn(
                    'absolute right-1 top-[6px] z-10 h-5 w-5 p-0 focus-visible:outline-none focus-visible:ring-transparent [&_svg]:size-4',
                    isTouch
                      ? 'pointer-events-auto opacity-100'
                      : 'pointer-events-none opacity-0 group-hover/chat:pointer-events-auto group-hover/chat:opacity-100'
                  )}
                >
                  <History className="focus-visible:outline-none focus-visible:ring-transparent" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t('chat.conversations.history')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton asChild>
            <div
              className="flex cursor-pointer items-center gap-2"
              onClick={onSearch}
            >
              <Search className="size-4 text-neutral-400" />
              <span>{t('search.title')}</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <ActionDialog
            contentClassName={notificationDialogContentClassName}
            closeClassName="size-6 mr-2"
            titleClassName="text-card-foreground pb-2 pl-2"
            title={t('notification_modal.title')}
            trigger={
              <SidebarMenuButton asChild>
                <div className="flex cursor-pointer items-center gap-2">
                  {unreadCount > 0 ? (
                    <BellDot className="size-4 text-neutral-400" />
                  ) : (
                    <Bell className="size-4 text-neutral-400" />
                  )}
                  <span>{t('notification')}</span>
                  {unreadCount > 0 ? (
                    <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-medium leading-none text-white">
                      {unreadCount}
                    </span>
                  ) : null}
                </div>
              </SidebarMenuButton>
            }
          >
            {close => <Notification onClose={close} />}
          </ActionDialog>
        </SidebarMenuItem>
      </SidebarMenu>
    </>
  );
}
