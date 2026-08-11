import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import ResourceTypeIcon from '@/components/ResourceTypeIcon';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { SidebarMenuButton, SidebarMenuItem } from '@/components/ui/Sidebar';
import { Spinner } from '@/components/ui/Spinner';
import { RssItem } from '@/interface';
import { cn } from '@/lib/utils';
import { useRssItemAutoScroll } from '@/page/sidebar/hooks/useRssItemAutoScroll';
import { fetchShareRssItem, fetchShareRssItems } from '@/service/share';

interface IProps {
  folderId: string;
  shareId: string;
}

// Share-scoped counterpart of the authenticated sidebar's RssItemList. Lists a
// shared rss folder's items inline and navigates to the shared item reader.
export default function ShareRssItemList({ folderId, shareId }: IProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { resource_id: activeFolderId, rss_item_id: activeItemId } =
    useParams();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<RssItem[]>([]);
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
  // Align item rows with leaf resource nodes in the shared sidebar.
  const paddingLeft = 28;

  const reload = useCallback(
    (signal?: AbortSignal) => {
      setLoading(true);
      return fetchShareRssItems(shareId, folderId, { limit: 50, signal })
        .then((res: RssItem[]) => setItems(res))
        .catch(() => {
          // Cancelled or failed; leave the list empty.
        })
        .finally(() => setLoading(false));
    },
    [shareId, folderId]
  );

  useEffect(() => {
    const controller = new AbortController();
    reload(controller.signal);
    return () => controller.abort();
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
    fetchShareRssItem(shareId, folderId, activeItemId, controller.signal)
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
    shareId,
  ]);

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
                    className="h-auto gap-1 bg-transparent py-1.5 transition-none hover:bg-transparent"
                    onClick={() =>
                      navigate(
                        `/s/${shareId}/${folderId}/rss-items/${item.id}`,
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
                        <span className="flex size-4 shrink-0 items-center justify-center rounded-[3px] border border-muted-foreground/60 text-[10px] font-medium leading-none">
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
