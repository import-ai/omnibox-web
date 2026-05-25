import axios from 'axios';
import { MessageCircle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import ResourceIcon from '@/assets/icons/resourceIcon';
import {
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import type { Resource, ResourceMeta } from '@/interface';
import { http } from '@/lib/request';

export interface IProps {
  open: boolean;
  onOpenChange: React.Dispatch<React.SetStateAction<boolean>>;
}

/** Same-origin URL for router paths (used by native ⌘/Ctrl+click → background tab). */
function appAbsoluteUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${window.location.origin}${normalized}`;
}

const SEARCH_LINK_ROW_CLASS =
  'flex flex-col items-start w-full text-left !text-foreground no-underline rounded-sm outline-none';
const SEARCH_LINK_INLINE_CLASS =
  'flex flex-1 items-center gap-2 min-w-0 text-left !text-foreground no-underline rounded-sm outline-none';

function SearchMenuHitAnchor(props: {
  path: string;
  className: string;
  onClick: React.MouseEventHandler<HTMLAnchorElement>;
  children: React.ReactNode;
}) {
  const { path, className, onClick, children } = props;
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

export default function SearchMenu({ open, onOpenChange }: IProps) {
  const params = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [keywords, setKeywords] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [recents, setRecents] = useState<ResourceMeta[]>([]);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const skipNavigateAfterModifierClickRef = useRef(false);

  /** Plain click: SPA navigate via cmdk onSelect. ⌘/Ctrl+click: let <a> default (browser opens background tab). */
  const onSearchResultAnchorClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (e.metaKey || e.ctrlKey) {
        skipNavigateAfterModifierClickRef.current = true;
        window.setTimeout(() => {
          if (skipNavigateAfterModifierClickRef.current) {
            skipNavigateAfterModifierClickRef.current = false;
          }
        }, 0);
        return;
      }
      e.preventDefault();
    },
    []
  );

  const resources = useMemo(
    () =>
      items
        .filter(item => item.type === 'resource')
        .map(item => ({
          ...item,
          title: item.title || t('untitled'),
          content: item.content || '',
        }))
        .map(item => ({
          ...item,
          content:
            item.content.length > 100
              ? item.content.slice(0, 100) + '...'
              : item.content,
        })),
    [items]
  );
  const messages = useMemo(
    () =>
      items
        .filter(item => item.type === 'message')
        .map(item => ({
          ...item,
          content: item.content || '',
        }))
        .map(item => ({
          ...item,
          content:
            item.content.length > 100
              ? item.content.slice(0, 100) + '...'
              : item.content,
        })),
    [items]
  );

  // Fetch search results
  useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    if (!keywords) {
      setItems([]);
      return;
    }

    debounceTimeout.current = setTimeout(() => {
      http
        .get(
          `/namespaces/${params.namespace_id}/search?query=${encodeURIComponent(keywords)}`
        )
        .then(data => {
          setItems(data || []);
        })
        .catch(err => {
          console.error(err);
        });
    }, 300);
  }, [keywords]);

  // Fetch recent resources when dialog opens without keywords
  useEffect(() => {
    if (!open) return;
    if (keywords) return;

    const { namespace_id: namespaceId } = params as { namespace_id?: string };
    if (!namespaceId) return;

    const source = axios.CancelToken.source();
    http
      .get(
        `/namespaces/${namespaceId}/resources/recent?limit=10&summary=true`,
        {
          cancelToken: source.token,
          mute: true,
        }
      )
      .then((items: ResourceMeta[] = []) => setRecents(items || []))
      .catch(() => void 0);

    return () => source.cancel();
  }, [open, keywords, params.namespace_id]);

  useEffect(() => {
    const handleKeyDownFN = (e: KeyboardEvent) => {
      if (e.key === 'j' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(val => !val);
      }
    };
    document.addEventListener('keydown', handleKeyDownFN);
    return () => document.removeEventListener('keydown', handleKeyDownFN);
  }, []);

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      className="bg-white dark:bg-[#303030]"
    >
      <CommandInput
        placeholder={t('search.placeholder')}
        value={keywords}
        onValueChange={setKeywords}
      />
      <CommandList className="min-h-[300px]">
        {!keywords && (
          <CommandGroup
            heading={t('chat.home.recent.title', {
              defaultValue: 'Recently Updated',
            })}
          >
            {recents.length === 0 ? (
              <CommandItem value="recent-empty" disabled>
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
                  attrs: (item as any).attrs || {},
                } as unknown as Resource;
                const recentPath = `/${params.namespace_id}/${item.id}`;
                return (
                  <CommandItem
                    key={item.id}
                    value={item.id}
                    className="cursor-pointer my-1"
                    onSelect={() => {
                      if (skipNavigateAfterModifierClickRef.current) {
                        skipNavigateAfterModifierClickRef.current = false;
                        return;
                      }
                      navigate(recentPath);
                      onOpenChange(false);
                    }}
                  >
                    <SearchMenuHitAnchor
                      path={recentPath}
                      className={SEARCH_LINK_ROW_CLASS}
                      onClick={onSearchResultAnchorClick}
                    >
                      <div className="flex items-center gap-2">
                        <div className="[&>svg]:w-4 [&>svg]:h-4 text-muted-foreground">
                          <ResourceIcon
                            expand={false}
                            resource={iconResource}
                          />
                        </div>
                        <div className="font-medium">
                          {item.name || t('untitled')}
                        </div>
                      </div>
                      {(item as any).content && (
                        <div className="text-sm text-muted-foreground ml-6">
                          {(item as any).content}
                        </div>
                      )}
                    </SearchMenuHitAnchor>
                  </CommandItem>
                );
              })
            )}
          </CommandGroup>
        )}
        {resources.length > 0 && (
          <CommandGroup heading={t('search.resources')}>
            {resources.map(resourceItem => {
              const iconResource = {
                id: resourceItem.resource_id || resourceItem.id,
                name: resourceItem.title,
                resource_type: (resourceItem as any).resource_type,
                parent_id: '',
                space_type: 'private',
                has_children: !!(resourceItem as any).has_children,
                attrs: (resourceItem as any).attrs || {},
              } as unknown as Resource;
              const resourcePath = `/${params.namespace_id}/${resourceItem.resource_id}?query=${encodeURIComponent(keywords)}`;
              return (
                <CommandItem
                  key={resourceItem.resource_id}
                  value={resourceItem.resource_id}
                  className="cursor-pointer my-1"
                  onSelect={() => {
                    if (skipNavigateAfterModifierClickRef.current) {
                      skipNavigateAfterModifierClickRef.current = false;
                      return;
                    }
                    navigate(resourcePath);
                    onOpenChange(false);
                  }}
                >
                  <SearchMenuHitAnchor
                    path={resourcePath}
                    className={SEARCH_LINK_ROW_CLASS}
                    onClick={onSearchResultAnchorClick}
                  >
                    <div className="flex items-center gap-2">
                      <div className="[&>svg]:w-4 [&>svg]:h-4 text-muted-foreground">
                        <ResourceIcon expand={false} resource={iconResource} />
                      </div>
                      <div className="font-medium">{resourceItem.title}</div>
                    </div>
                    {resourceItem.content && (
                      <div className="text-sm text-muted-foreground ml-6">
                        {resourceItem.content}
                      </div>
                    )}
                  </SearchMenuHitAnchor>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}
        {messages.length > 0 && (
          <CommandGroup heading={t('search.chats')}>
            {messages.map(message => {
              const chatPath = `/${params.namespace_id}/chat/${message.conversation_id}`;
              return (
                <CommandItem
                  key={message.id}
                  value={message.id}
                  className="cursor-pointer my-1"
                  onSelect={() => {
                    if (skipNavigateAfterModifierClickRef.current) {
                      skipNavigateAfterModifierClickRef.current = false;
                      return;
                    }
                    navigate(chatPath);
                    onOpenChange(false);
                  }}
                >
                  <SearchMenuHitAnchor
                    path={chatPath}
                    className={SEARCH_LINK_INLINE_CLASS}
                    onClick={onSearchResultAnchorClick}
                  >
                    <MessageCircle className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{message.content}</span>
                  </SearchMenuHitAnchor>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
