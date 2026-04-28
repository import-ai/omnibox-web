import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { ChatIcon } from '@/assets/icons/chatIcon';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/tooltip';
import {
  Sidebar,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { ResourceMeta } from '@/interface';
import { cn } from '@/lib/utils';

import ResourceTree from './components';
import { useSidebarInit } from './hooks/use-sidebar-init';

interface IProps {
  shareId: string;
  rootResource: ResourceMeta;
  username: string;
  showChat: boolean;
  isChatActive: boolean;
  currentResourceId?: string;
  currentResourcePath?: Array<{ id: string }>;
  isResourceActive: (resourceId: string) => boolean;
  onAddToContext: (resource: ResourceMeta, type: 'resource' | 'folder') => void;
}

export default function ShareSidebar(props: IProps) {
  const {
    shareId,
    rootResource,
    username,
    showChat,
    isChatActive,
    currentResourceId,
    currentResourcePath,
    isResourceActive,
    onAddToContext,
  } = props;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { open, isMobile } = useSidebar();

  useSidebarInit({
    shareId,
    rootResource,
    currentResourceId,
    currentResourcePath,
  });

  return (
    <Sidebar className="border-none">
      <SidebarHeader className="pt-[16px] gap-[10px] pr-0">
        <SidebarMenu>
          <SidebarMenuItem
            className={cn({
              'flex justify-between items-center': open,
            })}
          >
            <SidebarMenuButton className="gap-[6px] w-full px-1.5 h-auto">
              <div className="flex flex-shrink-0 rounded-[8px] size-[24px] text-[12px] items-center justify-center bg-primary text-primary-foreground dark:bg-neutral-700 dark:text-white">
                {username.charAt(0).toUpperCase()}
              </div>
              <span className="truncate">
                {t('share.share.user_share', { username })}
              </span>
            </SidebarMenuButton>
            {open && !isMobile && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SidebarTrigger className="text-neutral-400 hover:text-neutral-400 hover:bg-[#E6E6EC] dark:hover:bg-accent" />
                  </TooltipTrigger>
                  <TooltipContent>{t('sidebar.collapse')}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
        {showChat && (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isChatActive}>
                <div
                  className="flex cursor-pointer"
                  onClick={() => navigate(`/s/${shareId}/chat`)}
                >
                  <ChatIcon className="size-4" />
                  <span>{t('chat.title')}</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarHeader>
      <ResourceTree
        shareId={shareId}
        showChat={showChat}
        isChatActive={isChatActive}
        isResourceActive={isResourceActive}
        onAddToContext={onAddToContext}
      />
      <SidebarRail className="opacity-0" />
    </Sidebar>
  );
}
