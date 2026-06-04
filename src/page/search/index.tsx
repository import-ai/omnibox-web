import axios from 'axios';
import { X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { Button } from '@/components/button';
import { CommandDialog, CommandInput } from '@/components/ui/Command';
import useConfig from '@/hooks/useConfig';
import useProNamespaces from '@/hooks/useProNamespaces';
import useSmartFolderEntitlements from '@/hooks/useSmartFolderEntitlements';
import { NamespaceTier, type ResourceMeta } from '@/interface';
import { http } from '@/lib/request';
import { cn } from '@/lib/utils';
import type { ResourceConditionMatchMode } from '@/page/resource/conditions';
import { getConditionLimitValue } from '@/page/resource/conditions/resourceConditionUtils';
import { useResourceConditions } from '@/page/resource/conditions/useResourceConditions';

import { SearchFilterPanel } from './SearchFilterPanel';
import {
  SearchMessageResult,
  SearchRecentResource,
  SearchResourceResult,
  SearchResultList,
} from './SearchResultList';
import {
  buildSearchRequestPayload,
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
  const [matchMode, setMatchMode] = useState<ResourceConditionMatchMode>('all');
  const [recents, setRecents] = useState<SearchRecentResource[]>([]);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
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
  const showRecents = !shouldSearch;

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
    (path: string) => {
      navigate(path);
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
  const messages = useMemo<SearchMessageResult[]>(
    () =>
      items
        .filter(item => item.type === 'message')
        .map(item => ({
          ...item,
          content: item.content || '',
        })),
    [items]
  );

  useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    if (!shouldSearch) {
      setItems([]);
      return;
    }

    debounceTimeout.current = setTimeout(() => {
      http
        .post(
          `/namespaces/${namespaceId}/search`,
          buildSearchRequestPayload(keywords, conditions, matchMode)
        )
        .then(data => {
          setItems(data || []);
        })
        .catch(err => {
          console.error(err);
        });
    }, 300);
  }, [conditions, keywords, matchMode, namespaceId, shouldSearch]);

  useEffect(() => {
    if (!open) return;
    if (!showRecents) return;
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
      .then((items: ResourceMeta[] = []) =>
        setRecents((items || []) as SearchRecentResource[])
      )
      .catch(() => void 0);

    return () => source.cancel();
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
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      contentClassName="w-[calc(100vw-32px)] max-w-[1040px] rounded-2xl border-none bg-white shadow-xl dark:bg-neutral-900 [&>button]:hidden"
      className="h-[min(640px,calc(100vh-32px))] rounded-2xl bg-white px-5 py-4 text-foreground dark:bg-neutral-900"
    >
      <div className="relative flex h-full flex-col gap-2">
        <div className="flex h-7 items-center gap-3 border-b border-slate-200 pb-3 dark:border-neutral-800">
          <CommandInput
            placeholder={t('search.placeholder')}
            value={keywords}
            onValueChange={setKeywords}
            wrapperClassName="h-7 flex-1 border-b-0 px-0"
            iconClassName="mr-1 size-4 opacity-70"
            className="h-7 py-0 text-sm"
          />
          <div className="flex shrink-0 items-center justify-end gap-3">
            <div
              className={cn(
                'flex items-center gap-3',
                !keywords && 'invisible'
              )}
            >
              <Button
                type="button"
                variant="ghost"
                className="h-[22px] rounded bg-accent px-2 text-sm font-normal text-muted-foreground hover:bg-accent"
                onClick={handleClear}
              >
                {t('search.clear')}
              </Button>
              <span
                aria-hidden="true"
                className="h-4 w-px bg-slate-200 dark:bg-neutral-700"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-4 rounded-none p-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
              onClick={() => onOpenChange(false)}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_1px_268px] gap-0">
          <div className="min-h-0 min-w-0">
            <SearchResultList
              keywords={keywords}
              messages={messages}
              namespaceId={namespaceId}
              onAnchorClick={onSearchResultAnchorClick}
              onNavigate={handleNavigate}
              recents={recents}
              resources={resources}
              showRecents={showRecents}
              shouldSkipNavigate={shouldSkipNavigate}
            />
          </div>
          <div className="bg-slate-200 dark:bg-neutral-800" />
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
      </div>
    </CommandDialog>
  );
}
