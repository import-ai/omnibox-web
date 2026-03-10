import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { http } from '@/lib/request';
import { ChatIcon } from '@/page/sidebar/header/Chat';

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

  const [autoExpandedKeys, setAutoExpandedKeys] = useState<
    Record<string, boolean>
  >({});
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );
  const [childrenVersion, setChildrenVersion] = useState(0);
  const loadedChildrenRef = useRef<Record<string, ResourceMeta[]>>({});
  const expandedFoldersRef = useRef(expandedFolders);

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

      try {
        const data = await http.get(
          `/shares/${shareId}/resources/${folderId}/children`
        );
        const children = data || [];
        loadedChildrenRef.current[folderId] = children;
        setChildrenVersion(v => v + 1);
        return children;
      } catch {
        return [];
      }
    },
    [shareId]
  );

  const loadedChildren = useMemo(
    () => loadedChildrenRef.current,
    [childrenVersion]
  );

  useEffect(() => {
    if (!currentResourceId || !rootResource) {
      return;
    }

    const autoExpandKey = `${shareId}:${currentResourceId}`;
    if (autoExpandedKeys[autoExpandKey]) {
      return;
    }

    const abortController = new AbortController();
    const signal = abortController.signal;

    (async () => {
      try {
        if (rootResource.id === currentResourceId) {
          setAutoExpandedKeys(prev => ({ ...prev, [autoExpandKey]: true }));
          return;
        }

        const resource = await http.get(
          `/shares/${shareId}/resources/${currentResourceId}`,
          { signal }
        );

        let parentIds: string[] = [];

        if (resource?.path && Array.isArray(resource.path)) {
          parentIds = resource.path
            .slice(0, resource.path.length - 1)
            .map((p: { id: string }) => p.id);
        } else if (
          rootResource.id !== currentResourceId &&
          rootResource.has_children
        ) {
          const searchedFolderIds = new Set<string>();

          const findPathToResource = async (
            folderId: string,
            targetId: string,
            currentPath: string[] = []
          ): Promise<string[] | null> => {
            if (searchedFolderIds.has(folderId) || signal.aborted) {
              return null;
            }
            searchedFolderIds.add(folderId);

            const children = await fetchFolderChildren(folderId);

            for (const child of children) {
              if (child.id === targetId) {
                return currentPath;
              }
              if (child.has_children) {
                const result = await findPathToResource(child.id, targetId, [
                  ...currentPath,
                  child.id,
                ]);
                if (result) {
                  return result;
                }
              }
            }
            return null;
          };

          const path = await findPathToResource(
            rootResource.id,
            currentResourceId
          );
          if (path) {
            parentIds = path;
          }
        }

        if (
          rootResource.id !== currentResourceId &&
          rootResource.has_children &&
          !parentIds.includes(rootResource.id)
        ) {
          parentIds = [rootResource.id, ...parentIds];
        }

        if (parentIds.length === 0) {
          parentIds = [rootResource.id];
        }

        await Promise.all(parentIds.map(id => fetchFolderChildren(id)));

        const addedNewFolders = parentIds.some(
          id => !expandedFoldersRef.current.has(id)
        );

        setExpandedFolders(prev => {
          const newSet = new Set(prev);
          parentIds.forEach(id => newSet.add(id));
          return newSet;
        });
        setAutoExpandedKeys(prev => ({ ...prev, [autoExpandKey]: true }));

        if (addedNewFolders) {
          queueMicrotask(() => scrollToResource(currentResourceId));
        }
      } catch {
        setAutoExpandedKeys(prev => ({ ...prev, [autoExpandKey]: true }));
      }
    })();

    return () => abortController.abort();
  }, [
    currentResourceId,
    rootResource,
    shareId,
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
        fetchFolderChildren(folderId);
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
