import {
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { useEffect, useState, useRef, useMemo } from 'react';
import { http } from '@/lib/request';
import { useParams, useNavigate } from 'react-router-dom';
import { File, MessageCircle } from 'lucide-react';

export interface IProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchMenu({ open, onOpenChange }: IProps) {
  const params = useParams();
  const navigate = useNavigate();
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
    <CommandDialog
      open={open}
      onOpenChange={(val) => {
        onOpenChange(val);
      }}
    >
      <CommandInput
        placeholder="Search resources or chats..."
        value={keywords}
        onValueChange={setKeywords}
      />
      <CommandList>
        {resources.length > 0 && (
          <CommandGroup heading="Resources">
            {resources.map((resource) => (
              <CommandItem
                key={resource.id}
                onSelect={() => {
                  navigate(`/${params.namespace_id}/${resource.id}`);
                  onOpenChange(false);
                }}
              >
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <File className="w-4 h-4 text-muted-foreground" />
                    <span className="font-bold">{resource.name}</span>
                  </div>
                  <span>{resource.content}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {chatHistories.length > 0 && (
          <CommandGroup heading="Chats">
            {chatHistories.map((chatHistory) => (
              <CommandItem
                key={chatHistory.id}
                onSelect={() => {
                  navigate(
                    `/${params.namespace_id}/chat/${chatHistory.conversation_id}`,
                  );
                  onOpenChange(false);
                }}
              >
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-muted-foreground" />
                  <span>{chatHistory.content}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
