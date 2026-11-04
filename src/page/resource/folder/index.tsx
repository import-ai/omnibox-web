import { format } from 'date-fns';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/Button';
import Loading from '@/components/loading';
import ResourceTypeIcon from '@/components/ResourceTypeIcon';
import { Separator } from '@/components/ui/Separator';
import { Spinner } from '@/components/ui/Spinner';
import useApp from '@/hooks/useApp';
import { Resource, ResourceSummary } from '@/interface';
import { navigateToResource } from '@/page/resource/resourceNavigation';
import {
  isScrollToBottomContextFor,
  SCROLL_TO_BOTTOM_EVENT,
} from '@/page/resource/scrollToBottom';
import { getShareSmartFolderChildNavigationState } from '@/page/share/sidebar/navigation';
import { RssItemFeedBadge } from '@/page/sidebar/components/rss-folder/RssItemFeedBadge';
import {
  useRssFolderInitialSyncStatus,
  useRssFolderLinkNames,
} from '@/page/sidebar/components/rss-folder/useRssFolderLinkNames';
import { getSmartFolderChildSidebarKey } from '@/page/sidebar/components/smart-folder';
import type { ResourceSortOptions } from '@/service/resourceSort';

import { groupTimestampedItemsByTimestamp, itemTimestamp } from '../utils';
import { FolderContent } from './FolderContent';
import useFolderChildren from './useFolderChildren';

interface IProps {
  resourceId: string;
  apiPrefix: string;
  namespaceId: string;
  emptyText?: string;
  navigationPrefix: string;
  loadAll?: boolean;
  smartFolderParentId?: string;
  /** Overrides the backend's default child ordering (e.g. rss items). */
  sort?: ResourceSortOptions;
  /**
   * Set for an rss folder inside its own namespace: each item row is then shown
   * under the feed it came from (initial badge plus the feed's name), resolved
   * from the folder's config. Left off everywhere the config endpoint is not
   * reachable or would not describe these children — shares and smart folders.
   */
  rssFeedNames?: boolean;
}

export default function Folder(props: IProps) {
  const {
    resourceId,
    apiPrefix,
    namespaceId,
    emptyText,
    navigationPrefix,
    loadAll,
    smartFolderParentId,
    sort,
    rssFeedNames,
  } = props;
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const app = useApp();
  // One config request for the whole listing, not one per item row.
  const feedNames = useRssFolderLinkNames(
    namespaceId,
    resourceId,
    rssFeedNames
  );
  const initialSyncStatus = useRssFolderInitialSyncStatus(
    namespaceId,
    resourceId,
    rssFeedNames
  );
  const initialSyncLoading =
    !!rssFeedNames &&
    (initialSyncStatus === undefined ||
      initialSyncStatus === 'pending' ||
      initialSyncStatus === 'polling');
  const initialSyncFailed = !!rssFeedNames && initialSyncStatus === 'failed';
  const wasInitialSyncLoading = useRef(false);
  const sortQuery = sort
    ? `&sort_by=${sort.sort_by}&sort_order=${sort.sort_order}`
    : '';
  const folderContentApiPrefix = apiPrefix.includes('/smart-folders')
    ? `/namespaces/${namespaceId}/resources`
    : apiPrefix;
  const {
    data,
    hasMore,
    loadMore,
    loading,
    loadingMore,
    reload: reloadChildren,
    reloadSmartFolder: reloadSmartFolderChildren,
    replaceAll: replaceSmartFolderChildren,
    setData: onData,
  } = useFolderChildren({
    apiPrefix,
    loadAll,
    resourceId,
    smartFolderParentId,
    sortQuery,
  });

  useEffect(() => {
    if (!smartFolderParentId) return;
    return app.on(
      'smart_folder_children_updated',
      (id: string, children: ResourceSummary[]) => {
        if (id !== smartFolderParentId) {
          return;
        }

        replaceSmartFolderChildren(children);
      }
    );
  }, [app, replaceSmartFolderChildren, smartFolderParentId]);

  useEffect(() => {
    if (!smartFolderParentId) return;
    const hooks = [
      app.on('delete_resource', reloadSmartFolderChildren),
      app.on('update_resource', reloadSmartFolderChildren),
      app.on('restore_resource', reloadSmartFolderChildren),
    ];
    return () => {
      hooks.forEach(unsub => unsub());
    };
  }, [app, reloadSmartFolderChildren, smartFolderParentId]);

  useEffect(() => {
    if (smartFolderParentId) return;

    const hooks = [
      app.on('delete_resource', (id: string, parentId?: string | null) => {
        onData(prev => {
          if (parentId !== resourceId && !prev.some(item => item.id === id)) {
            return prev;
          }
          return prev.filter(item => item.id !== id);
        });
      }),
      app.on('restore_resource', (resource: Resource) => {
        if (!resource?.id || resource.parent_id !== resourceId) {
          return;
        }
        onData(prev => {
          if (prev.some(item => item.id === resource.id)) {
            return prev;
          }
          return [
            {
              id: resource.id,
              name: resource.name || '',
              resource_type: resource.resource_type,
              attrs: resource.attrs || {},
              content: resource.content || '',
              has_children: !!resource.has_children,
              created_at: resource.created_at || '',
              updated_at: resource.updated_at || '',
            },
            ...prev,
          ];
        });
      }),
    ];
    return () => {
      hooks.forEach(unsub => unsub());
    };
  }, [app, resourceId, smartFolderParentId]);

  useEffect(() => {
    return app.on('batch_move_resource_children_changed', (id: string) => {
      if (id === resourceId) {
        if (smartFolderParentId) {
          reloadSmartFolderChildren();
          return;
        }
        reloadChildren();
      }
    });
  }, [
    app,
    reloadChildren,
    reloadSmartFolderChildren,
    resourceId,
    smartFolderParentId,
  ]);

  useEffect(() => {
    return app.on(SCROLL_TO_BOTTOM_EVENT, (context: unknown) => {
      if (
        isScrollToBottomContextFor(context, {
          namespaceId,
          resourceId,
        })
      ) {
        loadMore();
      }
    });
  }, [app, loadMore, namespaceId, resourceId]);

  useEffect(() => {
    if (initialSyncLoading) {
      wasInitialSyncLoading.current = true;
      return;
    }
    if (
      wasInitialSyncLoading.current &&
      initialSyncStatus === 'succeeded' &&
      !loading
    ) {
      wasInitialSyncLoading.current = false;
      reloadChildren();
    }
  }, [initialSyncLoading, initialSyncStatus, loading, reloadChildren]);

  if (loading) {
    return (
      <Loading label={rssFeedNames ? t('rss_folder.loading') : undefined} />
    );
  }

  return (
    <div className="min-w-0 space-y-6 pb-[30vh]">
      {data.length > 0 && (initialSyncLoading || initialSyncFailed) && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {initialSyncLoading && <Spinner className="size-4" />}
          {t(
            initialSyncLoading ? 'rss_folder.loading' : 'rss_folder.load_failed'
          )}
        </div>
      )}
      {data.length > 0 ? (
        <>
          {groupTimestampedItemsByTimestamp(data, i18n, itemTimestamp).map(
            ([key, items]) => (
              <div key={key} className="min-w-0">
                <div className="pb-4">
                  <p className="text-sm text-muted-foreground font-light ml-0.5">
                    {key}
                  </p>
                </div>
                {items.map((item, index) => {
                  const iconResource = {
                    id: item.id,
                    name: item.name,
                    resource_type: item.resource_type,
                    parent_id: '',
                    space_type: 'private',
                    has_children: !!item.has_children,
                    attrs: (item as any).attrs || {},
                  } as unknown as Resource;
                  const linkId = item.attrs?.link_id;
                  const feedName =
                    item.resource_type === 'rss_item' &&
                    typeof linkId === 'string'
                      ? feedNames[linkId]
                      : undefined;
                  return (
                    <div
                      className="group min-w-0 cursor-pointer"
                      key={item.id}
                      onClick={() => {
                        navigateToResource(
                          navigate,
                          `${navigationPrefix}/${item.id}`,
                          {
                            state: smartFolderParentId
                              ? navigationPrefix.startsWith('/s/')
                                ? getShareSmartFolderChildNavigationState(
                                    smartFolderParentId,
                                    item.id
                                  )
                                : {
                                    sidebarActiveKey:
                                      getSmartFolderChildSidebarKey(
                                        smartFolderParentId,
                                        item.id
                                      ),
                                  }
                              : undefined,
                          }
                        );
                      }}
                    >
                      <div className="mb-2 flex min-w-0 items-center justify-between">
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <RssItemFeedBadge
                            name={feedName}
                            size="page"
                            fallback={
                              <div className="shrink-0 text-muted-foreground [&>svg]:h-5 [&>svg]:w-5">
                                <ResourceTypeIcon
                                  expand={false}
                                  resource={iconResource}
                                />
                              </div>
                            }
                          />
                          <h3 className="min-w-0 flex-1 truncate text-lg font-medium group-hover:text-blue-500">
                            {item.name || t('untitled')}
                          </h3>
                        </div>
                      </div>
                      {item.resource_type === 'folder' ? (
                        <FolderContent
                          resource={item}
                          apiPrefix={folderContentApiPrefix}
                          namespaceId={namespaceId}
                        />
                      ) : (
                        <p className="text-muted-foreground text-sm line-clamp-2 leading-relaxed">
                          {itemTimestamp(item)
                            ? format(
                                itemTimestamp(item)!,
                                'yyyy-MM-dd HH:mm:ss'
                              )
                            : ''}
                          {feedName && (
                            <span
                              className="ml-1.5"
                              data-testid="rss-feed-name"
                            >
                              {feedName}
                            </span>
                          )}
                        </p>
                      )}
                      {index < items.length - 1 && (
                        <Separator className="my-4" />
                      )}
                    </div>
                  );
                })}
              </div>
            )
          )}
          {!loadAll && hasMore && (
            <div className="pb-4 flex justify-center">
              <Button
                variant="secondary"
                className="block w-full"
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? t('loading') : t('load_more')}
              </Button>
            </div>
          )}
        </>
      ) : initialSyncLoading ? (
        <div className="mt-12">
          <Loading label={t('rss_folder.loading')} />
        </div>
      ) : initialSyncFailed ? (
        <div className="mt-12 text-center text-muted-foreground">
          {t('rss_folder.load_failed')}
        </div>
      ) : (
        <div className="mt-12 text-center text-muted-foreground">
          {emptyText || t('no_pages_inside')}
        </div>
      )}
    </div>
  );
}
