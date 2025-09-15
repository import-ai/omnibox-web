import { Sparkles } from 'lucide-react';
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
} from '@/components/ui/sidebar';
import { ResourceMeta } from '@/interface';

import SidebarItem from './sidebar-item';

interface SharedSidebarProps {
  shareId: string;
  currentResourceId: string;
  rootResource: ResourceMeta;
  showChat?: boolean;
}

export default function ShareSidebar(props: SharedSidebarProps) {
  const { shareId, currentResourceId, rootResource, showChat } = props;
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleChatClick = () => {
    navigate(`/s/${shareId}/chat`);
  };

  return (
    <Sidebar>
      {showChat && (
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
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
                currentResourceId={currentResourceId}
              />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
