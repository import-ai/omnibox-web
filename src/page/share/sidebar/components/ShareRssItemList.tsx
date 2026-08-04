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
import { fetchShareRssItems } from '@/service/share';

interface IProps {
  folderId: string;
  shareId: string;
}

// Share-scoped counterpart of the authenticated sidebar's RssItemList. Lists a
// shared rss folder's items inline and navigates to the shared item reader.
export default function ShareRssItemList({ folderId, shareId }: IProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { rss_item_id: activeItemId } = useParams();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<RssItem[]>([]);
  useRssItemAutoScroll(
    activeItemId,
    items.some(item => item.id === activeItemId)
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

  if (items.length === 0) {
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
      {items.map(item => {
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
