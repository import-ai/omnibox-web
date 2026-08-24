import { Loader2 } from 'lucide-react';
import type { MouseEventHandler, UIEvent } from 'react';
import { useTranslation } from 'react-i18next';

import ResourceIcon from '@/assets/icons/ResourceIcon';
import {
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/Command';
import { Spinner } from '@/components/ui/Spinner';
import type { Resource, ResourceMeta } from '@/interface';

import { SearchResultAnchor, SearchResultContent } from './SearchResultItem';
import {
  searchResultEmptyItemClassName,
  searchResultGroupClassName,
  searchResultItemClassName,
  searchResultListClassName,
  searchResultLoadingClassName,
} from './searchResultLayout';
import {
  buildSearchPreview,
  shouldShowRecentResourcesEmpty,
  shouldShowRecentResourcesLoading,
  shouldShowSearchLoading,
  shouldShowSearchNoResults,
} from './searchUtils';

interface SearchResultListProps {
  keywords: string;
  loadingInitial: boolean;
  loadingRecents: boolean;
  namespaceId?: string;
  loadingMore: boolean;
  onAnchorClick: MouseEventHandler<HTMLAnchorElement>;
  onLoadMore: () => void;
  onNavigate: (path: string, target: 'chat' | 'resource') => void;
  recents: SearchRecentResource[];
  resources: SearchResourceResult[];
  showRecents: boolean;
  shouldSkipNavigate: () => boolean;
}

export interface SearchRecentResource extends ResourceMeta {
  content?: string;
}

export interface SearchResourceResult {
  attrs?: Record<string, any>;
  content?: string;
  has_children?: boolean;
  id?: string;
  resource_id?: string;
  resource_type?: Resource['resource_type'];
  title: string;
}

function SearchEmptyIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-24 shrink-0 text-neutral-300 dark:text-neutral-400"
      viewBox="0 0 96 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M88 48H64L56 60H40L32 48H8"
        stroke="currentColor"
        strokeWidth="3.06383"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21.8 20.44L8 48V72C8 74.1217 8.84285 76.1566 10.3431 77.6569C11.8434 79.1571 13.8783 80 16 80H80C82.1217 80 84.1566 79.1571 85.6569 77.6569C87.1572 76.1566 88 74.1217 88 72V48L74.2 20.44C73.5377 19.1071 72.5167 17.9855 71.2518 17.2011C69.987 16.4168 68.5283 16.0008 67.04 16H28.96C27.4717 16.0008 26.0131 16.4168 24.7482 17.2011C23.4833 17.9855 22.4623 19.1071 21.8 20.44Z"
        stroke="currentColor"
        strokeWidth="3.06383"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SearchNoResults({ label }: { label?: string }) {
  const { t } = useTranslation();

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-6 text-center">
      <SearchEmptyIcon />
      <p className="text-lg font-normal leading-normal text-muted-foreground">
        {label || t('search.no_results')}
      </p>
    </div>
  );
}

function ResourceResultContent({
  resource,
  title,
  preview,
}: {
  preview?: string;
  resource: Resource;
  title: string;
}) {
  return (
    <SearchResultContent
      icon={<ResourceIcon expand={false} resource={resource} />}
      title={title}
      preview={preview}
    />
  );
}

export function SearchResultList({
  keywords,
  loadingInitial,
  loadingRecents,
  namespaceId,
  loadingMore,
  onAnchorClick,
  onLoadMore,
  onNavigate,
  recents,
  resources,
  showRecents,
  shouldSkipNavigate,
}: SearchResultListProps) {
  const { t } = useTranslation();
  const showNoResults = shouldShowSearchNoResults(
    showRecents,
    resources.length,
    0,
    loadingInitial
  );
  const showLoading = shouldShowSearchLoading(
    !showRecents,
    loadingInitial,
    resources.length
  );
  const showRecentResourcesLoading = shouldShowRecentResourcesLoading(
    showRecents,
    loadingRecents,
    recents.length
  );
  const showRecentResourcesEmpty = shouldShowRecentResourcesEmpty(
    showRecents,
    loadingRecents,
    recents.length
  );
  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    const isCloseToBottom =
      target.scrollTop + target.clientHeight >= target.scrollHeight - 80;

    if (isCloseToBottom && !showRecents && !loadingMore) {
      onLoadMore();
    }
  };

  return (
    <CommandList className={searchResultListClassName} onScroll={handleScroll}>
      {showLoading ? (
        <div className={searchResultLoadingClassName}>
          <Spinner className="size-6" />
        </div>
      ) : null}
      {showNoResults ? <SearchNoResults /> : null}

      {showRecents && (
        <CommandGroup
          className={searchResultGroupClassName}
          heading={t('chat.home.recent.title', {
            defaultValue: 'Recently Updated',
          })}
        >
          {showRecentResourcesLoading ? (
            <div className={searchResultLoadingClassName}>
              <Spinner className="size-5" />
            </div>
          ) : null}

          {showRecentResourcesEmpty ? (
            <CommandItem
              value="recent-empty"
              disabled
              className={searchResultEmptyItemClassName}
            >
              {t('chat.home.recent.empty', {
                defaultValue: 'No recent resources',
              })}
            </CommandItem>
          ) : null}

          {recents.length > 0
            ? recents.map(item => {
                const iconResource = {
                  id: item.id,
                  name: item.name,
                  resource_type: item.resource_type,
                  parent_id: '',
                  space_type: 'private',
                  has_children: !!item.has_children,
                  attrs: item.attrs || {},
                } as unknown as Resource;
                const recentPath = `/${namespaceId}/${item.id}`;
                const title = item.name || t('untitled');
                const preview = buildSearchPreview(item.content);

                return (
                  <CommandItem
                    key={item.id}
                    value={item.id}
                    className={searchResultItemClassName}
                    onSelect={() => {
                      if (shouldSkipNavigate()) {
                        return;
                      }
                      onNavigate(recentPath, 'resource');
                    }}
                  >
                    <SearchResultAnchor
                      path={recentPath}
                      preview={!!preview}
                      onClick={onAnchorClick}
                    >
                      <ResourceResultContent
                        resource={iconResource}
                        title={title}
                        preview={preview}
                      />
                    </SearchResultAnchor>
                  </CommandItem>
                );
              })
            : null}
        </CommandGroup>
      )}

      {resources.length > 0 && (
        <CommandGroup
          className={searchResultGroupClassName}
          heading={t('search.resources')}
        >
          {resources.map(resourceItem => {
            const resourceId =
              resourceItem.resource_id || resourceItem.id || '';
            const iconResource = {
              id: resourceId,
              name: resourceItem.title,
              resource_type: resourceItem.resource_type,
              parent_id: '',
              space_type: 'private',
              has_children: !!resourceItem.has_children,
              attrs: resourceItem.attrs || {},
            } as unknown as Resource;
            const resourcePath = `/${namespaceId}/${resourceId}?query=${encodeURIComponent(keywords)}`;
            const preview = buildSearchPreview(resourceItem.content);

            return (
              <CommandItem
                key={resourceId}
                value={resourceId}
                className={searchResultItemClassName}
                onSelect={() => {
                  if (shouldSkipNavigate()) {
                    return;
                  }
                  onNavigate(resourcePath, 'resource');
                }}
              >
                <SearchResultAnchor
                  path={resourcePath}
                  preview={!!preview}
                  onClick={onAnchorClick}
                >
                  <ResourceResultContent
                    resource={iconResource}
                    title={resourceItem.title}
                    preview={preview}
                  />
                </SearchResultAnchor>
              </CommandItem>
            );
          })}
        </CommandGroup>
      )}

      {loadingMore ? (
        <div className="flex h-10 items-center justify-center text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
        </div>
      ) : null}
    </CommandList>
  );
}
