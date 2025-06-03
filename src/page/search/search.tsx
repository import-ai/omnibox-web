import {
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useEffect, useState, useRef, useMemo } from 'react';
import { http } from '@/lib/request';
import { useParams } from 'react-router-dom';

export function SearchMenu() {
  const params = useParams();
  const [open, setOpen] = useState(false);
  const [keywords, setKeywords] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'j' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

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
          `/namespaces/${params.namespace_id}/search?q=${encodeURIComponent(keywords)}`,
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
          content:
            item.content.length > 100
              ? item.content.slice(0, 100) + '...'
              : item.content,
        })),
    [items],
  );
  const chatHistories = useMemo(
    () =>
      items
        .filter((item) => item.type === 'chat_history')
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
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search resources or chats..."
        value={keywords}
        onValueChange={setKeywords}
      />
      <CommandList>
        {resources.length > 0 && (
          <CommandGroup heading="Resources">
            {resources.map((resource) => (
              <CommandItem key={resource.id}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 'bold' }}>{resource.name}</span>
                  <span>{resource.content}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {chatHistories.length > 0 && (
          <CommandGroup heading="Resources">
            {chatHistories.map((chatHistory) => (
              <CommandItem key={chatHistory.id}>
                <span>{chatHistory.content}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
