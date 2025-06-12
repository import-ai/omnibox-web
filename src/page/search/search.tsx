import { http } from '@/lib/request';
import { useTranslation } from 'react-i18next';
import { File, MessageCircle } from 'lucide-react';
import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

export interface IProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchMenu({ open, onOpenChange }: IProps) {
  const params = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [keywords, setKeywords] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'j' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        const newOpen = !open;
        onOpenChange(newOpen);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);

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
          `/namespaces/${params.namespace_id}/search?query=${encodeURIComponent(keywords)}`,
        )
        .then((data) => {
          setItems(data || []);
        })
        .catch((err) => {
          console.log(err);
        });
    }, 300);
  }, [keywords]);

  const resources = useMemo(
    () =>
      items
        .filter((item) => item.type === 'resource')
        .map((item) => ({
          ...item,
          title: item.title || t('untitled'),
          content: item.content || '',
        }))
        .map((item) => ({
          ...item,
          content:
            item.content.length > 100
              ? item.content.slice(0, 100) + '...'
              : item.content,
        })),
    [items],
  );
  const messages = useMemo(
    () =>
      items
        .filter((item) => item.type === 'message')
        .map((item) => ({
          ...item,
          content: item.content || '',
        }))
        .map((item) => ({
          ...item,
          content:
            item.content.length > 100
              ? item.content.slice(0, 100) + '...'
              : item.content,
        })),
    [items],
  );

  return (
    <CommandDialog
      open={open}
      className="bg-white dark:bg-[#303030]"
      onOpenChange={(val) => {
        onOpenChange(val);
      }}
    >
      <CommandInput
        placeholder={t('search.placeholder')}
        value={keywords}
        onValueChange={setKeywords}
      />
      <CommandList className="min-h-[300px]">
        {resources.length > 0 && (
          <CommandGroup heading={t('search.resources')}>
            {resources.map((resource) => (
              <CommandItem
                key={resource.id}
                value={resource.id}
                className="cursor-pointer"
                onSelect={() => {
                  navigate(`/${params.namespace_id}/${resource.resource_id}`);
                  onOpenChange(false);
                }}
              >
                <File className="size-4 text-muted-foreground" />
                {resource.title}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {messages.length > 0 && (
          <CommandGroup heading={t('search.chats')}>
            {messages.map((message) => (
              <CommandItem
                key={message.id}
                value={message.id}
                className="cursor-pointer"
                onSelect={() => {
                  navigate(
                    `/${params.namespace_id}/chat/${message.conversation_id}`,
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
