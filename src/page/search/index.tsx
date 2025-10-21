import axios from 'axios';
import { File, MessageCircle } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import {
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import type { ResourceMeta } from '@/interface';
import { http } from '@/lib/request';

export interface IProps {
  open: boolean;
  onOpenChange: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function SearchMenu({ open, onOpenChange }: IProps) {
  const params = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [keywords, setKeywords] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [recents, setRecents] = useState<ResourceMeta[]>([]);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
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
      .get(`/namespaces/${namespaceId}/resources/recent?limit=10`, {
        cancelToken: source.token,
        mute: true,
      })
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

  useEffect(() => {
    if (open) {
      return;
    }
    setKeywords('');
  }, [open]);

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
              recents.map(item => (
                <CommandItem
                  key={item.id}
                  value={item.id}
                  className="cursor-pointer"
                  onSelect={() => {
                    navigate(`/${params.namespace_id}/${item.id}`);
                    onOpenChange(false);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <File className="size-4 text-muted-foreground" />
                    <div className="font-medium truncate max-w-[500px]">
                      {item.name || t('untitled')}
                    </div>
                  </div>
                </CommandItem>
              ))
            )}
          </CommandGroup>
        )}
        {resources.length > 0 && (
          <CommandGroup heading={t('search.resources')}>
            {resources.map(resource => (
              <CommandItem
                key={resource.id}
                value={resource.id}
                className="cursor-pointer"
                onSelect={() => {
                  navigate(
                    `/${params.namespace_id}/${resource.resource_id}?query=${encodeURIComponent(keywords)}`
                  );
                  onOpenChange(false);
                }}
              >
                <div className="flex flex-col items-start w-full">
                  <div className="flex items-center gap-2">
                    <File className="size-4 text-muted-foreground" />
                    <div className="font-medium">{resource.title}</div>
                  </div>
                  {resource.content && (
                    <div className="text-sm text-muted-foreground ml-6">
                      {resource.content}
                    </div>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {messages.length > 0 && (
          <CommandGroup heading={t('search.chats')}>
            {messages.map(message => (
              <CommandItem
                key={message.id}
                value={message.id}
                className="cursor-pointer"
                onSelect={() => {
                  navigate(
                    `/${params.namespace_id}/chat/${message.conversation_id}`
                  );
                  onOpenChange(false);
                }}
              >
                <MessageCircle className="size-4 text-muted-foreground" />
                {message.content}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
