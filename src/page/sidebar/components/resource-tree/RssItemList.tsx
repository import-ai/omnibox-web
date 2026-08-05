import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import ResourceTypeIcon from '@/components/ResourceTypeIcon';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { SidebarMenuButton, SidebarMenuItem } from '@/components/ui/Sidebar';
import { Spinner } from '@/components/ui/Spinner';
import useApp from '@/hooks/useApp';
import { Resource, RssItem } from '@/interface';
import { cn } from '@/lib/utils';
import { useRssItemAutoScroll } from '@/page/sidebar/hooks/useRssItemAutoScroll';
import { fetchRssItem, fetchRssItems } from '@/service/resource';

interface IProps {
  folderId: string;
  namespaceId: string;
  depth: number;
}

export default function RssItemList({ folderId, namespaceId, depth }: IProps) {
  const { t } = useTranslation();
  const app = useApp();
  const navigate = useNavigate();
  const { resource_id: activeFolderId, rss_item_id: activeItemId } =
    useParams();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<RssItem[]>([]);
  const requestControllerRef = useRef<AbortController | null>(null);
  const [activeItemFallback, setActiveItemFallback] = useState<RssItem | null>(
    null
  );
  const activeItemInList = items.some(item => item.id === activeItemId);
  const displayedItems =
    activeItemFallback !== null &&
    activeItemFallback.id === activeItemId &&
    !activeItemInList
      ? [...items, activeItemFallback]
      : items;
  useRssItemAutoScroll(
    activeItemId,
    displayedItems.some(item => item.id === activeItemId)
  );
  // Match the indent of a leaf resource node at this depth.
  const paddingLeft = depth * 20 + 28;

  const reload = useCallback(() => {
    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;
    setLoading(true);
    return fetchRssItems(namespaceId, folderId, {
      limit: 50,
      signal: controller.signal,
    })
      .then((res: RssItem[]) => {
        if (requestControllerRef.current === controller) {
          setItems(res);
        }
      })
      .catch(() => {
        // request.ts handles backend error toasts.
      })
      .finally(() => {
        if (requestControllerRef.current === controller) {
          requestControllerRef.current = null;
          setLoading(false);
        }
      });
  }, [namespaceId, folderId]);

  useEffect(() => {
    reload();
    return () => {
      const controller = requestControllerRef.current;
      requestControllerRef.current = null;
      controller?.abort();
    };
  }, [reload]);

  useEffect(() => {
    if (
      loading ||
      !activeItemId ||
      activeFolderId !== folderId ||
      activeItemInList
    ) {
      setActiveItemFallback(null);
      return;
    }

    const controller = new AbortController();
    setActiveItemFallback(null);
    fetchRssItem(namespaceId, folderId, activeItemId, controller.signal)
      .then(item => {
        if (!controller.signal.aborted) setActiveItemFallback(item);
      })
      .catch(() => {
        // The detail view handles invalid or inaccessible item errors.
      });
    return () => controller.abort();
  }, [
    activeFolderId,
    activeItemId,
    activeItemInList,
    folderId,
    loading,
    namespaceId,
  ]);

  // Editing the folder's links changes which items it has, so refetch when this
  // folder is updated.
  useEffect(() => {
    return app.on('update_resource', (delta: Resource) => {
      if (delta.id === folderId) {
        reload();
      }
    });
  }, [app, folderId, reload]);

  useEffect(() => {
    return app.on('refresh_rss_items', (refreshedFolderId: string) => {
      if (refreshedFolderId === folderId) {
        reload();
      }
    });
  }, [app, folderId, reload]);

  if (loading) {
    return (
      <SidebarMenuItem>
        <div
          className="flex items-center py-1.5 text-neutral-400"
          style={{ paddingLeft }}
        >
          <Spinner />
        </div>
      </SidebarMenuItem>
    );
  }

  if (displayedItems.length === 0) {
    return (
      <SidebarMenuItem>
        <div
          className="py-1.5 text-sm text-muted-foreground"
          style={{ paddingLeft }}
        >
          {t('rss_folder.empty')}
        </div>
      </SidebarMenuItem>
    );
  }

  return (
    <>
      {displayedItems.map(item => {
        const title = item.title || t('untitled');
        return (
          <SidebarMenuItem key={item.id}>
            <div
              className={cn(
                'group/sidebar-item my-px flex items-center rounded-md hover:bg-sidebar-accent',
                activeItemId === item.id &&
                  'bg-[#E2E2E6] dark:bg-[#363637] hover:bg-[#E2E2E6]'
              )}
            >
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <SidebarMenuButton
                    asChild
                    className="h-auto gap-1 bg-transparent py-1.5 transition-none hover:bg-transparent group-has-[[data-sidebar=menu-action]]/menu-item:pr-1"
                    onClick={() =>
                      navigate(
                        `/${namespaceId}/${folderId}/rss-items/${item.id}`,
                        { state: { fromSidebar: true } }
                      )
                    }
                  >
                    <div
                      data-rss-item-id={item.id}
                      className="list flex cursor-pointer"
                      style={{ paddingLeft }}
                    >
                      {item.link_name ? (
                        <span className="flex size-4 shrink-0 items-center justify-center rounded-[3px] border text-[9px] font-normal leading-none">
                          {item.link_name.charAt(0).toUpperCase()}
                        </span>
                      ) : (
                        <ResourceTypeIcon
                          resource={{
                            id: item.id,
                            name: title,
                            parentId: folderId,
                            resourceType: 'link',
                            hasChildren: false,
                            attrs: item.url ? { url: item.url } : {},
                          }}
                        />
                      )}
                      <span className="flex-1 truncate">{title}</span>
                    </div>
                  </SidebarMenuButton>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  sideOffset={8}
                  className="max-w-xs break-all"
                >
                  {title}
                </TooltipContent>
              </Tooltip>
            </div>
          </SidebarMenuItem>
        );
      })}
    </>
  );
}
