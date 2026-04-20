import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { ResourceMeta } from '@/interface';
import { http } from '@/lib/request';
import { cn } from '@/lib/utils';

import SidebarItem from './sidebar-item';

interface SharedSidebarProps {
  shareId: string;
  rootResource: ResourceMeta;
  username: string;
  showChat: boolean;
  isChatActive: boolean;
  currentResourceId?: string;
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
    currentResourceId,
    isResourceActive,
    onAddToContext,
  } = props;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { open, isMobile } = useSidebar();

  const [autoExpandedKeys, setAutoExpandedKeys] = useState<
    Record<string, boolean>
  >({});
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );
  const [childrenVersion, setChildrenVersion] = useState(0);
  const loadedChildrenRef = useRef<Record<string, ResourceMeta[]>>({});
  const expandedFoldersRef = useRef(expandedFolders);
  const pendingRequests = useRef<Map<string, Promise<ResourceMeta[]>>>(
    new Map()
  );
  const hasAutoExpandedRef = useRef<Record<string, boolean>>({});

  // Keep ref in sync with state
  useEffect(() => {
    expandedFoldersRef.current = expandedFolders;
  }, [expandedFolders]);

  const handleChatClick = () => {
    navigate(`/s/${shareId}/chat`);
  };

  const scrollToResource = useCallback((resourceId: string) => {
    requestAnimationFrame(() => {
      const element = document.querySelector(
        `[data-resource-id="${resourceId}"]`
      );
      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    });
  }, []);

  const fetchFolderChildren = useCallback(
    async (folderId: string): Promise<ResourceMeta[]> => {
      const cached = loadedChildrenRef.current[folderId];
      if (cached) return cached;

      const pending = pendingRequests.current.get(folderId);
      if (pending) return pending;

      const promise = http
        .get(`/shares/${shareId}/resources/${folderId}/children`)
        .then(data => {
          const children = data || [];
          loadedChildrenRef.current[folderId] = children;
          setChildrenVersion(v => v + 1);
          pendingRequests.current.delete(folderId);
          return children;
        })
        .catch(() => {
          pendingRequests.current.delete(folderId);
          return [];
        });

      pendingRequests.current.set(folderId, promise);
      return promise;
    },
    [shareId]
  );

  const loadedChildren = useMemo(
    () => loadedChildrenRef.current,
    [childrenVersion]
  );

  useEffect(() => {
    if (!rootResource.has_children) {
      return;
    }

    if (hasAutoExpandedRef.current[shareId]) {
      return;
    }

    const abortController = new AbortController();
    const { signal } = abortController;

    (async () => {
      hasAutoExpandedRef.current[shareId] = true;

      const allFolderIds = new Set<string>();
      let currentLevel: string[] = [rootResource.id];

      while (currentLevel.length > 0 && !signal.aborted) {
        const results = await Promise.all(
          currentLevel.map(id => fetchFolderChildren(id))
        );

        const nextLevel: string[] = [];

        results.forEach((children, index) => {
          const folderId = currentLevel[index];
          allFolderIds.add(folderId);

          for (const child of children) {
            if (child.has_children && !allFolderIds.has(child.id)) {
              nextLevel.push(child.id);
            }
          }
        });

        currentLevel = nextLevel;
      }

      if (signal.aborted) return;

      setExpandedFolders(prev => {
        const next = new Set(prev);
        allFolderIds.forEach(id => next.add(id));
        return next;
      });

      if (!currentResourceId) return;

      const autoExpandKey = `${shareId}:${currentResourceId}`;
      if (autoExpandedKeys[autoExpandKey]) return;

      setAutoExpandedKeys(prev => ({ ...prev, [autoExpandKey]: true }));

      // Wait for DOM update then scroll
      queueMicrotask(() => scrollToResource(currentResourceId));
    })();

    return () => abortController.abort();
  }, [
    shareId,
    rootResource.id,
    rootResource.has_children,
    currentResourceId,
    fetchFolderChildren,
    scrollToResource,
    autoExpandedKeys,
  ]);

  const handleToggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
        fetchFolderChildren(folderId);
      }
      return newSet;
    });
  };

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
