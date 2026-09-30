import { Bell, BellDot, Gift, History, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation, useParams } from 'react-router-dom';

import { ChatIcon } from '@/assets/icons/ChatIcon';
import { Button } from '@/components/Button';
import ActionDialog from '@/components/invite-dialog/ActionDialog';
import Notification from '@/components/notification';
import { useNotificationUnreadCount } from '@/components/notification/hooks/useNotifications';
import { notificationDialogContentClassName } from '@/components/notification/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/tooltip';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/Sidebar';
import { useIsTouch } from '@/hooks/useIsTouch';
import { cn } from '@/lib/utils';

interface IProps {
  onActiveKey: (activeKey: string) => void;
  onSearch: () => void;
}

export function Header(props: IProps) {
  const { onActiveKey } = props;
  const pathname = useLocation().pathname;
  const { conversation_id: conversationId } = useParams();
  const isChatActive = pathname.includes('/chat') && !conversationId;
  const inviteActive = pathname.includes('/invite-referral');
  const { t } = useTranslation();
  // const downloadAppHref = `/${i18n.language.startsWith('zh') ? 'zh-cn' : 'en'}/download/`;
  const isTouch = useIsTouch();
  const unreadCount = useNotificationUnreadCount();
  const onChat = () => {
    onActiveKey('chat');
  };
  const onChatHistory = () => {
    onActiveKey('chat/conversations');
  };

  const onInviteReferral = () => {
    onActiveKey('invite-referral');
  };

  return (
    <SidebarMenu className="mb-2 gap-1">
      <SidebarMenuItem className="group/chat">
        <SidebarMenuButton
          asChild
          isActive={isChatActive}
          className="h-(--sidebar-row-height) px-3 pr-8"
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
                  'absolute right-2 top-1/2 -translate-y-1/2 z-10 h-5 w-5 p-0 focus-visible:outline-hidden focus-visible:ring-transparent [&_svg]:size-4',
                  isTouch
                    ? 'pointer-events-auto opacity-100'
                    : 'pointer-events-none opacity-0 group-hover/chat:pointer-events-auto group-hover/chat:opacity-100'
                )}
              >
                <History className="focus-visible:outline-hidden focus-visible:ring-transparent" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('chat.conversations.history')}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <ActionDialog
          contentClassName={notificationDialogContentClassName}
          closeClassName="mr-2"
          titleClassName="text-card-foreground pb-2 pl-2"
          title={t('notification_modal.title')}
          trigger={
            <SidebarMenuButton
              asChild
              className="h-(--sidebar-row-height) px-3"
            >
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
      <SidebarMenuItem>
        <SidebarMenuButton asChild className="h-(--sidebar-row-height) px-3">
          <a
            href="https://www.omnibox.pro/community/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sidebar-foreground! hover:text-sidebar-accent-foreground!"
          >
            <Users className="size-4 text-neutral-400" />
            <span>{t('notification_modal.tags.community')}</span>
          </a>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={inviteActive}
          className="h-(--sidebar-row-height) px-3"
        >
          <div
            className="flex cursor-pointer items-center gap-2"
            onClick={onInviteReferral}
          >
            <Gift className="size-4 text-blue-500" />
            <span className="font-normal">{t('inviteReferral.homeEntry')}</span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
