import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

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
} from '@/components/ui/sidebar';
import { ResourceMeta } from '@/interface';

import SidebarItem from './sidebar-item';

interface SharedSidebarProps {
  shareId: string;
  rootResource: ResourceMeta;
  showChat?: boolean;
  isResourceActive: (resourceId: string) => boolean;
}

export default function ShareSidebar(props: SharedSidebarProps) {
  const { shareId, rootResource, showChat, isResourceActive } = props;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const isChatActive = location.pathname.includes('/chat');

  const handleChatClick = () => {
    navigate(`/s/${shareId}/chat`);
  };

  return (
    <Sidebar>
      {showChat && (
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isChatActive}>
                <div className="flex cursor-pointer" onClick={handleChatClick}>
                  <Sparkles className="w-4 h-4" />
                  <span>{t('chat.title')}</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
      )}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t('share.share.title')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarItem
                shareId={shareId}
                resource={rootResource}
                isResourceActive={isResourceActive}
              />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
