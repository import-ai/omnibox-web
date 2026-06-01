import { MessageCircle } from 'lucide-react';
import type { MouseEventHandler, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import ResourceIcon from '@/assets/icons/ResourceIcon';
import {
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/Command';
import type { Resource, ResourceMeta } from '@/interface';

import { buildSearchPreview, shouldShowSearchNoResults } from './searchUtils';

const SEARCH_LINK_ROW_CLASS =
  'flex w-full flex-col items-start rounded-lg px-2 py-1 text-left !text-foreground no-underline outline-none';
const SEARCH_LINK_INLINE_CLASS =
  'flex flex-1 items-center gap-2 min-w-0 rounded-lg px-2 py-1 text-left !text-foreground no-underline outline-none';

interface SearchResultAnchorProps {
  children: ReactNode;
  className: string;
  onClick: MouseEventHandler<HTMLAnchorElement>;
  path: string;
}

interface SearchResultListProps {
  keywords: string;
  messages: SearchMessageResult[];
  namespaceId?: string;
  onAnchorClick: MouseEventHandler<HTMLAnchorElement>;
  onNavigate: (path: string) => void;
  recents: SearchRecentResource[];
  resources: SearchResourceResult[];
  showRecents: boolean;
  shouldSkipNavigate: () => boolean;
}

export interface SearchMessageResult {
  content: string;
  conversation_id: string;
  id: string;
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

function appAbsoluteUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${window.location.origin}${normalized}`;
}

function SearchResultAnchor({
  children,
  className,
  onClick,
  path,
}: SearchResultAnchorProps) {
  return (
    <a
      href={appAbsoluteUrl(path)}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={onClick}
    >
      {children}
    </a>
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
    <>
      <div className="flex w-full items-center gap-2">
        <div className="flex size-4 shrink-0 items-center justify-center text-muted-foreground [&>svg]:size-4">
          <ResourceIcon expand={false} resource={resource} />
        </div>
        <div className="min-w-0 flex-1 truncate text-base font-medium leading-6 text-foreground">
          {title}
        </div>
      </div>
      {preview ? (
        <div className="ml-6 mt-1 line-clamp-2 text-sm leading-[22px] text-[rgba(26,26,26,0.36)] dark:text-neutral-500">
          {preview}
        </div>
      ) : null}
    </>
  );
}

export function SearchResultList({
  keywords,
  messages,
  namespaceId,
  onAnchorClick,
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
    messages.length
  );

  return (
    <CommandList className="h-full max-h-none overflow-y-auto overflow-x-hidden pr-2">
      {showNoResults ? (
        <div className="flex h-full items-center justify-center px-2 text-sm text-muted-foreground">
          {t('search.no_results')}
        </div>
      ) : null}

      {showRecents && (
        <CommandGroup
          className="p-0 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-0 [&_[cmdk-group-heading]]:text-base [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:leading-6"
          heading={t('chat.home.recent.title', {
            defaultValue: 'Recently Updated',
          })}
        >
          {recents.length === 0 ? (
            <CommandItem
              value="recent-empty"
              disabled
              className="mt-2 rounded-lg px-2 py-2"
            >
              {t('chat.home.recent.empty', {
                defaultValue: 'No recent resources',
              })}
            </CommandItem>
          ) : (
            recents.map(item => {
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
                  className="my-1 cursor-pointer rounded-lg p-0 data-[selected=true]:bg-accent"
                  onSelect={() => {
                    if (shouldSkipNavigate()) {
                      return;
                    }
                    onNavigate(recentPath);
                  }}
                >
                  <SearchResultAnchor
                    path={recentPath}
                    className={SEARCH_LINK_ROW_CLASS}
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
          )}
        </CommandGroup>
      )}

      {resources.length > 0 && (
        <CommandGroup
          className="p-0 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-0 [&_[cmdk-group-heading]]:text-base [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:leading-6"
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
                className="my-1 cursor-pointer rounded-lg p-0 data-[selected=true]:bg-accent"
                onSelect={() => {
                  if (shouldSkipNavigate()) {
                    return;
                  }
                  onNavigate(resourcePath);
                }}
              >
                <SearchResultAnchor
                  path={resourcePath}
                  className={SEARCH_LINK_ROW_CLASS}
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

      {messages.length > 0 && (
        <CommandGroup
          className="p-0 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-0 [&_[cmdk-group-heading]]:text-base [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:leading-6"
          heading={t('search.chats')}
        >
          {messages.map(message => {
            const chatPath = `/${namespaceId}/chat/${message.conversation_id}`;
            return (
              <CommandItem
                key={message.id}
                value={message.id}
                className="my-1 cursor-pointer rounded-lg p-0 data-[selected=true]:bg-accent"
                onSelect={() => {
                  if (shouldSkipNavigate()) {
                    return;
                  }
                  onNavigate(chatPath);
                }}
              >
                <SearchResultAnchor
                  path={chatPath}
                  className={SEARCH_LINK_INLINE_CLASS}
                  onClick={onAnchorClick}
                >
                  <MessageCircle className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{message.content}</span>
                </SearchResultAnchor>
              </CommandItem>
            );
          })}
        </CommandGroup>
      )}
    </CommandList>
  );
}
