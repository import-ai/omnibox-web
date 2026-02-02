import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import { ResourceMeta } from '@/interface';
import { ChatIcon } from '@/page/sidebar/header/Chat';

import SidebarItem from './sidebar-item';

interface SharedSidebarProps {
  shareId: string;
  rootResource: ResourceMeta;
  username: string;
  showChat: boolean;
  isChatActive: boolean;
  isResourceActive: (resourceId: string) => boolean;
  onAddToContext: (resource: ResourceMeta, type: 'resource' | 'folder') => void;
}

export default function ShareSidebar(props: SharedSidebarProps) {
  const {
    shareId,
    rootResource,
    username,
    showChat,
    isChatActive,
    isResourceActive,
    onAddToContext,
  } = props;
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleChatClick = () => {
    navigate(`/s/${shareId}/chat`);
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-1.5 py-2">
          <div className="flex flex-shrink-0 rounded-[8px] size-[24px] text-[12px] items-center justify-center bg-primary text-primary-foreground dark:bg-neutral-700 dark:text-white">
            {username.charAt(0).toUpperCase()}
          </div>
          <span className="truncate font-semibold text-sm">
            {t('share.share.user_share', { username })}
          </span>
        </div>
        {showChat && (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isChatActive}>
                <div className="flex cursor-pointer" onClick={handleChatClick}>
                  <ChatIcon className="size-4" />
                  <span>{t('chat.title')}</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t('share.share.title')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarItem
                shareId={shareId}
                resource={rootResource}
                isResourceActive={isResourceActive}
                isChatActive={isChatActive}
                showChat={showChat}
                onAddToContext={onAddToContext}
              />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail className="opacity-0" />
    </Sidebar>
  );
}
