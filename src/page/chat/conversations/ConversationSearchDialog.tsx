import axios from 'axios';
import { MessageCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { SearchDialog } from '@/components/search/SearchDialog';
import {
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/Command';
import { Spinner } from '@/components/ui/Spinner';
import useUser from '@/hooks/useUser';
import { http } from '@/lib/request';
import type { ConversationSummary } from '@/page/chat/core/types/conversation';
import {
  SearchResultAnchor,
  SearchResultContent,
} from '@/page/search/SearchResultItem';
import {
  searchResultEmptyItemClassName,
  searchResultGroupClassName,
  searchResultItemClassName,
  searchResultListClassName,
  searchResultLoadingClassName,
} from '@/page/search/searchResultLayout';
import { SearchNoResults } from '@/page/search/SearchResultList';

interface ConversationSearchDialogProps {
  namespaceId: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  onConversationSelect?: (conversationId: string) => void;
}

interface ConversationSearchResult {
  content: string;
  conversation_id: string;
  id: string;
  message_id: string;
  role: 'user' | 'assistant';
  title: string;
}

const SEARCH_LIMIT = 100;

function stripCitations(content?: string) {
  return content?.replace(/\[\[\d+]]/g, '').trim() || '';
}

export default function ConversationSearchDialog({
  namespaceId,
  onConversationSelect,
  onOpenChange,
  open,
}: ConversationSearchDialogProps) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { user } = useUser();
  const [keywords, setKeywords] = useState('');
  const [loading, setLoading] = useState(false);
  const [recents, setRecents] = useState<ConversationSummary[]>([]);
  const [results, setResults] = useState<ConversationSearchResult[]>([]);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const requestIdRef = useRef(0);
  const skipNavigateAfterModifierClickRef = useRef(false);
  const normalizedKeywords = keywords.trim();
  const showRecents = normalizedKeywords.length === 0;

  const formatMessagePreview = (message?: {
    content: string;
    role: 'user' | 'assistant';
  }) => {
    const content = stripCitations(message?.content);
    if (!content || !message) return undefined;
    const role =
      message.role === 'assistant'
        ? t('chat.conversations.roles.assistant')
        : user.username || t('account.username');
    const separator = i18n.language.startsWith('zh') ? '：' : ': ';
    return `${role}${separator}${content}`;
  };

  const openConversation = (conversationId: string, messageId?: string) => {
    const hash = messageId ? `#message-${messageId}` : '';
    if (onConversationSelect) {
      window.history.pushState(null, '', hash || window.location.pathname);
      onConversationSelect(conversationId);
    } else {
      navigate(`/${namespaceId}/chat/${conversationId}${hash}`);
    }
    onOpenChange(false);
  };

  const handleAnchorClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey) {
      skipNavigateAfterModifierClickRef.current = true;
      window.setTimeout(() => {
        skipNavigateAfterModifierClickRef.current = false;
      }, 0);
      return;
    }
    event.preventDefault();
  };

  const shouldSkipNavigate = () => {
    if (!skipNavigateAfterModifierClickRef.current) return false;
    skipNavigateAfterModifierClickRef.current = false;
    return true;
  };

  useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
      debounceTimeout.current = null;
    }

    if (!open || showRecents) {
      requestIdRef.current += 1;
      setResults([]);
      setLoading(false);
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setResults([]);
    setLoading(true);
    debounceTimeout.current = setTimeout(() => {
      http
        .post(`/namespaces/${namespaceId}/search`, {
          query: normalizedKeywords,
          type: 'message',
          offset: 0,
          limit: SEARCH_LIMIT,
        })
        .then(data => {
          if (requestIdRef.current !== requestId) return;
          setResults(Array.isArray(data?.items) ? data.items : []);
        })
        .catch(error => {
          if (requestIdRef.current !== requestId) return;
          console.error(error);
        })
        .finally(() => {
          if (requestIdRef.current === requestId) setLoading(false);
        });
    }, 300);

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
        debounceTimeout.current = null;
      }
    };
  }, [namespaceId, normalizedKeywords, open, showRecents]);

  useEffect(() => {
    if (!open || !showRecents) return;

    const source = axios.CancelToken.source();
    let cancelled = false;
    setRecents([]);
    setLoading(true);
    http
      .get(
        `/namespaces/${namespaceId}/conversations?offset=0&limit=10&order=desc`,
        { cancelToken: source.token, mute: true }
      )
      .then(data => {
        if (!cancelled) setRecents(Array.isArray(data?.data) ? data.data : []);
      })
      .catch(error => {
        if (!axios.isCancel(error)) console.error(error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      source.cancel();
    };
  }, [namespaceId, open, showRecents]);

  return (
    <SearchDialog
      open={open}
      onOpenChange={onOpenChange}
      value={keywords}
      onValueChange={setKeywords}
      onClear={() => setResults([])}
      placeholder={t('chat.conversations.search')}
      clearLabel={t('search.clear')}
      closeLabel={t('close')}
      contentClassName="max-w-[920px]"
    >
      <div className="min-h-0 flex-1">
        <CommandList className={searchResultListClassName}>
          {loading ? (
            <div className={searchResultLoadingClassName}>
              <Spinner className="size-6" />
            </div>
          ) : null}

          {!loading && !showRecents && results.length === 0 ? (
            <SearchNoResults label={t('chat.conversations.noResults')} />
          ) : null}

          {showRecents ? (
            <CommandGroup
              className={searchResultGroupClassName}
              heading={t('chat.conversations.recent')}
            >
              {!loading && recents.length === 0 ? (
                <CommandItem
                  value="conversation-recent-empty"
                  disabled
                  className={searchResultEmptyItemClassName}
                >
                  {t('chat.conversations.empty')}
                </CommandItem>
              ) : null}
              {recents.map(item => {
                const title =
                  item.title ||
                  stripCitations(item.user_content) ||
                  t('chat.conversations.new');
                const preview = formatMessagePreview(item.last_message);
                const path = `/${namespaceId}/chat/${item.id}`;
                return (
                  <CommandItem
                    key={item.id}
                    value={item.id}
                    className={searchResultItemClassName}
                    onSelect={() => {
                      if (!shouldSkipNavigate()) openConversation(item.id);
                    }}
                  >
                    <SearchResultAnchor
                      path={path}
                      preview={Boolean(preview)}
                      onClick={handleAnchorClick}
                    >
                      <SearchResultContent
                        icon={<MessageCircle />}
                        title={title}
                        preview={preview}
                      />
                    </SearchResultAnchor>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ) : results.length > 0 ? (
            <CommandGroup
              className={searchResultGroupClassName}
              heading={t('chat.conversations.messages')}
            >
              {results.map(item => {
                const title = item.title || t('chat.conversations.new');
                const preview = formatMessagePreview(item);
                const path = `/${namespaceId}/chat/${item.conversation_id}#message-${item.message_id}`;
                return (
                  <CommandItem
                    key={item.message_id}
                    value={`${item.conversation_id}-${item.message_id}`}
                    className={searchResultItemClassName}
                    onSelect={() => {
                      if (!shouldSkipNavigate()) {
                        openConversation(item.conversation_id, item.message_id);
                      }
                    }}
                  >
                    <SearchResultAnchor
                      path={path}
                      preview
                      onClick={handleAnchorClick}
                    >
                      <SearchResultContent
                        icon={<MessageCircle />}
                        title={title}
                        preview={preview}
                      />
                    </SearchResultAnchor>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ) : null}
        </CommandList>
      </div>
    </SearchDialog>
  );
}
