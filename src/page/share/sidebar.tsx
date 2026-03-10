import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

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
import { http } from '@/lib/request';
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
  const params = useParams();
  const currentResourceId = params.resource_id;

  // Manage expanded folders state and loaded children data
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );
  const [loadedChildren, setLoadedChildren] = useState<
    Record<string, ResourceMeta[]>
  >({});
  const [autoExpanded, setAutoExpanded] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);

  const handleChatClick = () => {
    navigate(`/s/${shareId}/chat`);
  };

  const scrollToResource = useCallback((resourceId: string) => {
    // Multiple attempts to scroll since rendering might be delayed
    const attempts = [0, 100, 300, 500];
    attempts.forEach(delay => {
      setTimeout(() => {
        const element = document.querySelector(
          `[data-resource-id="${resourceId}"]`
        );
        if (element) {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        }
      }, delay);
    });
  }, []);

  // Fetch children for a folder
  const fetchFolderChildren = useCallback(
    async (folderId: string): Promise<ResourceMeta[]> => {
      if (loadedChildren[folderId]) {
        return loadedChildren[folderId];
      }
      try {
        const data = await http.get(
          `/shares/${shareId}/resources/${folderId}/children`
        );
        const children = data || [];
        setLoadedChildren(prev => ({ ...prev, [folderId]: children }));
        return children;
      } catch (error) {
        console.error(`Failed to fetch children for ${folderId}:`, error);
        return [];
      }
    },
    [shareId, loadedChildren]
  );

  // Auto-expand folders and scroll to selected resource
  useEffect(() => {
    if (!currentResourceId || autoExpanded || isExpanding || !rootResource) {
      return;
    }

    const fetchAndExpand = async () => {
      setIsExpanding(true);
      try {
        console.log('[ShareSidebar] Fetching resource:', currentResourceId);

        // Fetch the resource details to get the path
        const resource = await http.get(
          `/shares/${shareId}/resources/${currentResourceId}`
        );

        console.log('[ShareSidebar] Resource data:', resource);

        if (resource && resource.path && Array.isArray(resource.path)) {
          console.log('[ShareSidebar] Resource path:', resource.path);

          // Collect all parent folder IDs from path (excluding the target itself)
          const parentIds = resource.path
            .slice(0, resource.path.length - 1)
            .map(p => p.id);

          console.log('[ShareSidebar] Parent IDs to expand:', parentIds);

          // Load children for all parent folders
          const loadPromises = parentIds.map(parentId =>
            fetchFolderChildren(parentId)
          );

          await Promise.all(loadPromises);

          console.log('[ShareSidebar] All parent children loaded');

          // Set expanded folders
          setExpandedFolders(new Set(parentIds));
          setAutoExpanded(true);

          // Scroll after state updates and DOM re-renders
          setTimeout(() => {
            console.log(
              '[ShareSidebar] Attempting to scroll to:',
              currentResourceId
            );
            scrollToResource(currentResourceId);
          }, 300);
        } else {
          console.log('[ShareSidebar] No path in resource or root resource');
          // If current resource is the root resource itself
          if (rootResource.id === currentResourceId) {
            setAutoExpanded(true);
            scrollToResource(currentResourceId);
          }
        }
      } catch (error) {
        console.error('[ShareSidebar] Failed to fetch resource path:', error);
      } finally {
        setIsExpanding(false);
      }
    };

    fetchAndExpand();
  }, [
    currentResourceId,
    rootResource,
    shareId,
    autoExpanded,
    isExpanding,
    fetchFolderChildren,
    scrollToResource,
  ]);

  const handleToggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
        // Fetch children if not already loaded
        if (!loadedChildren[folderId]) {
          fetchFolderChildren(folderId);
        }
      }
      return newSet;
    });
  };

  return (
    <Sidebar className="border-none">
      <SidebarHeader className="pt-[16px] gap-[10px] pr-0">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="gap-[6px] w-full px-1.5 h-auto">
              <div className="flex flex-shrink-0 rounded-[8px] size-[24px] text-[12px] items-center justify-center bg-primary text-primary-foreground dark:bg-neutral-700 dark:text-white">
                {username.charAt(0).toUpperCase()}
              </div>
              <span className="truncate">
                {t('share.share.user_share', { username })}
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
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
      <SidebarContent
        className="no-scrollbar overflow-y-auto"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <SidebarGroup className="pr-0">
          <SidebarGroupLabel className="h-8 font-normal leading-8 text-neutral-400">
            {t('share.share.title')}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarItem
                shareId={shareId}
                resource={rootResource}
                isResourceActive={isResourceActive}
                isChatActive={isChatActive}
                showChat={showChat}
                onAddToContext={onAddToContext}
                expandedFolders={expandedFolders}
                loadedChildren={loadedChildren}
                onToggleFolder={handleToggleFolder}
              />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail className="opacity-0" />
    </Sidebar>
  );
}
