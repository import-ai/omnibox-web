import axios from 'axios';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { SearchDialog } from '@/components/search/SearchDialog';
import useConfig from '@/hooks/useConfig';
import useProNamespaces from '@/hooks/useProNamespaces';
import useSmartFolderEntitlements from '@/hooks/useSmartFolderEntitlements';
import { NamespaceTier, type ResourceMeta } from '@/interface';
import { http } from '@/lib/request';
import type { ResourceConditionMatchMode } from '@/page/resource/conditions';
import { getConditionLimitValue } from '@/page/resource/conditions/resourceConditionUtils';
import { useResourceConditions } from '@/page/resource/conditions/useResourceConditions';
import { navigateToResource } from '@/page/resource/resourceNavigation';

import { SearchFilterPanel } from './SearchFilterPanel';
import {
  searchDialogBodyClassName,
  searchLayoutSeparatorClassName,
} from './searchLayout';
import {
  SearchRecentResource,
  SearchResourceResult,
  SearchResultList,
} from './SearchResultList';
import {
  buildSearchRequestPayload,
  SEARCH_PAGE_SIZE,
  shouldRefreshSearchRequest,
  shouldRunSearchRequest,
} from './searchUtils';

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
  const [hasMore, setHasMore] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingRecents, setLoadingRecents] = useState(false);
  const [matchMode, setMatchMode] = useState<ResourceConditionMatchMode>('all');
  const [recents, setRecents] = useState<SearchRecentResource[]>([]);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const searchRequestIdRef = useRef(0);
  const skipNavigateAfterModifierClickRef = useRef(false);
  const namespaceId = params.namespace_id;
  const { config, loading: configLoading } = useConfig();
  const { data: proNamespaces } = useProNamespaces({
    disabled: configLoading || !config.commercial,
  });
  const currentNamespace = proNamespaces.find(item => item.id === namespaceId);
  const { data: entitlements } = useSmartFolderEntitlements({ namespaceId });
  const resolvedTier =
    entitlements?.tier ??
    (currentNamespace?.tier === NamespaceTier.PREMIUM ? 'premium' : 'basic');
  const maxConditionCount =
    entitlements?.ruleLimit ?? getConditionLimitValue(resolvedTier);
  const {
    conditionListRef,
    conditions,
    addCondition,
    removeCondition,
    handleFieldChange,
    handleOperatorChange,
    handleValueChange,
  } = useResourceConditions(maxConditionCount);
  const remainingConditionCount = Math.max(
    maxConditionCount - conditions.length,
    0
  );
  const canAddCondition = conditions.length < maxConditionCount;
  const shouldSearch = shouldRunSearchRequest(keywords, conditions);
  const shouldRefreshSearch = shouldRefreshSearchRequest(
    open,
    keywords,
    conditions
  );
  const showRecents = !shouldSearch;

  const fetchSearchPage = useCallback(
    async (offset: number, requestId: number) => {
      const data = await http.post(
        `/namespaces/${namespaceId}/search`,
        buildSearchRequestPayload(keywords, conditions, matchMode, {
          offset,
          limit: SEARCH_PAGE_SIZE,
        }),
        { mute: offset > 0 }
      );

      if (searchRequestIdRef.current !== requestId) {
        return;
      }

      const nextItems = Array.isArray(data?.items) ? data.items : [];
      const total =
        typeof data?.total === 'number' ? data.total : nextItems.length;
      setItems(current =>
        offset === 0 ? nextItems : [...current, ...nextItems]
      );
      setHasMore(offset + nextItems.length < total);
    },
    [conditions, keywords, matchMode, namespaceId]
  );

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

  const shouldSkipNavigate = useCallback(() => {
    if (!skipNavigateAfterModifierClickRef.current) {
      return false;
    }

    skipNavigateAfterModifierClickRef.current = false;
    return true;
  }, []);

  const handleNavigate = useCallback(
    (path: string, target: 'chat' | 'resource') => {
      if (target === 'resource') navigateToResource(navigate, path);
      else navigate(path);
      onOpenChange(false);
    },
    [navigate, onOpenChange]
  );

  const resources = useMemo<SearchResourceResult[]>(
    () =>
      items
        .filter(item => item.type === 'resource')
        .map(item => ({
          ...item,
          title: item.title || t('untitled'),
          content: item.content || '',
        })),
    [items, t]
  );
  useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
      debounceTimeout.current = null;
      setLoadingInitial(false);
    }

    if (!shouldRefreshSearch) {
      searchRequestIdRef.current += 1;
      setItems([]);
      setHasMore(false);
      setLoadingInitial(false);
      setLoadingMore(false);
      return;
    }

    const requestId = searchRequestIdRef.current + 1;
    searchRequestIdRef.current = requestId;
    setItems([]);
    setHasMore(false);
    setLoadingInitial(true);
    setLoadingMore(false);
    debounceTimeout.current = setTimeout(() => {
      fetchSearchPage(0, requestId)
        .catch(err => {
          if (searchRequestIdRef.current !== requestId) {
            return;
          }

          console.error(err);
        })
        .finally(() => {
          if (searchRequestIdRef.current === requestId) {
            setLoadingInitial(false);
          }
        });
    }, 300);
  }, [fetchSearchPage, shouldRefreshSearch]);

  const handleLoadMore = useCallback(() => {
    if (!shouldSearch || !hasMore || loadingMore) {
      return;
    }

    const requestId = searchRequestIdRef.current;
    const offset = items.length;
    setLoadingMore(true);
    fetchSearchPage(offset, requestId)
      .catch(err => {
        if (searchRequestIdRef.current !== requestId) {
          return;
        }

        console.error(err);
      })
      .finally(() => {
        if (searchRequestIdRef.current === requestId) {
          setLoadingMore(false);
        }
      });
  }, [fetchSearchPage, hasMore, items.length, loadingMore, shouldSearch]);

  useEffect(() => {
    if (!open) return;
    if (!showRecents) return;
    if (!namespaceId) {
      setLoadingRecents(false);
      return;
    }

    const source = axios.CancelToken.source();
    let cancelled = false;
    setLoadingRecents(true);

    // summary=true is required for recent API to include `content` at all.
    http
      .get(
        `/namespaces/${namespaceId}/resources/recent?limit=10&summary=true`,
        {
          cancelToken: source.token,
          mute: true,
        }
      )
      .then((items: ResourceMeta[] = []) => {
        if (cancelled) return;
        setRecents((items || []) as SearchRecentResource[]);
      })
      .catch(() => void 0)
      .finally(() => {
        if (!cancelled) {
          setLoadingRecents(false);
        }
      });

    return () => {
      cancelled = true;
      source.cancel();
      setLoadingRecents(false);
    };
  }, [open, showRecents, namespaceId]);

  useEffect(() => {
    const handleKeyDownFN = (e: KeyboardEvent) => {
      if (e.key === 'j' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(val => !val);
      }
    };
    document.addEventListener('keydown', handleKeyDownFN);
    return () => document.removeEventListener('keydown', handleKeyDownFN);
  }, [onOpenChange]);

  const handleClear = () => {
    setKeywords('');
    setItems([]);
  };

  return (
    <SearchDialog
      open={open}
      onOpenChange={onOpenChange}
      value={keywords}
      onValueChange={setKeywords}
      onClear={handleClear}
      placeholder={t('search.placeholder')}
      clearLabel={t('search.clear')}
      closeLabel={t('close')}
    >
      <div className={searchDialogBodyClassName}>
        <div className="min-h-0 min-w-0">
          <SearchResultList
            keywords={keywords}
            loadingInitial={loadingInitial}
            loadingRecents={loadingRecents}
            namespaceId={namespaceId}
            loadingMore={loadingMore}
            onLoadMore={handleLoadMore}
            onAnchorClick={onSearchResultAnchorClick}
            onNavigate={handleNavigate}
            recents={recents}
            resources={resources}
            showRecents={showRecents}
            shouldSkipNavigate={shouldSkipNavigate}
          />
        </div>
        <div className={searchLayoutSeparatorClassName} />
        <div className="min-w-0">
          <SearchFilterPanel
            canAddCondition={canAddCondition}
            conditionListRef={conditionListRef}
            conditions={conditions}
            currentNamespace={currentNamespace}
            matchMode={matchMode}
            maxConditionCount={maxConditionCount}
            namespaceId={namespaceId}
            onAddCondition={() => addCondition(conditions.length - 1)}
            onFieldChange={handleFieldChange}
            onMatchModeChange={setMatchMode}
            onOperatorChange={handleOperatorChange}
            onRemoveCondition={removeCondition}
            onValueChange={handleValueChange}
            remainingConditionCount={remainingConditionCount}
          />
        </div>
      </div>
    </SearchDialog>
  );
}
