import { format } from 'date-fns';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import logoUrl from '@/assets/logo.svg';
import { Button } from '@/components/button';
import { Spinner } from '@/components/ui/Spinner';
import {
  fetchInviteRecords,
  type InviteRecord,
} from '@/service/inviteReferral';

import { InviteEmptyState } from './InviteEmptyState';
import { formatInviteeName, isShortInviteeName } from './inviteeName';

const PAGE_SIZE = 20;

interface InviteRecordsPanelProps {
  invitedCount: number;
}

export function InviteRecordsPanel({ invitedCount }: InviteRecordsPanelProps) {
  const { t } = useTranslation();
  const [items, setItems] = useState<InviteRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setError(false);
    try {
      const page = await fetchInviteRecords(0, PAGE_SIZE);
      setItems(page.items);
      setTotal(page.total);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const loadMore = async () => {
    if (loadingMore || items.length >= total) return;
    setLoadingMore(true);
    try {
      const page = await fetchInviteRecords(items.length, PAGE_SIZE);
      setItems(current => [...current, ...page.items]);
      setTotal(page.total);
    } finally {
      setLoadingMore(false);
    }
  };

  const onScroll = () => {
    const node = listRef.current;
    if (!node || loadingMore || items.length >= total) return;
    if (node.scrollTop + node.clientHeight >= node.scrollHeight - 80) {
      void loadMore();
    }
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <h2 className="shrink-0 px-[25px] py-6 text-center text-sm font-medium">
        {t('inviteReferral.records.title')}
      </h2>
      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Spinner className="size-6 text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8">
          <p className="text-center text-sm text-muted-foreground">
            {t('inviteReferral.records.loadFailed')}
          </p>
          <Button type="button" variant="outline" onClick={() => void load()}>
            {t('inviteReferral.common.retry')}
          </Button>
        </div>
      ) : items.length === 0 ? (
        <InviteEmptyState />
      ) : (
        <>
          <div className="shrink-0 px-[25px]">
            <div className="flex h-[84px] items-center overflow-hidden rounded-lg border border-[#f2f2f7] bg-white dark:border-border dark:bg-[#262626]">
              <div className="flex flex-1 items-center justify-center">
                <span className="text-base font-medium leading-[30px]">
                  {t('inviteReferral.summary.invited')}
                </span>
              </div>
              <div className="h-11 w-px shrink-0 bg-[#f2f2f7] dark:bg-border" />
              <div className="flex flex-1 items-center justify-center">
                <span className="text-base font-medium leading-[30px]">
                  {t('inviteReferral.summary.people', { count: invitedCount })}
                </span>
              </div>
            </div>
          </div>
          <div
            ref={listRef}
            onScroll={onScroll}
            className="min-h-0 flex-1 overflow-y-auto px-[25px] pb-6 pt-6"
          >
            <div className="flex flex-col gap-6">
              {items.map(item => {
                const displayName = formatInviteeName(
                  item.invitee.display_name
                );
                const shortName = isShortInviteeName(displayName);
                return (
                  <div
                    key={item.id}
                    className="rounded-[10px] border border-[#f2f2f7] bg-white px-6 py-4 md:px-[99px] dark:border-border dark:bg-[#262626]"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="relative h-9">
                          <img
                            src={item.invitee.avatar_url || logoUrl}
                            alt=""
                            width={36}
                            height={36}
                            className="absolute left-0 top-0 size-9 rounded-full object-cover"
                          />
                          <p
                            className={
                              shortName
                                ? 'ml-[18px] flex h-9 w-[99px] items-center justify-center text-center text-sm font-medium leading-[21px]'
                                : 'ml-[46px] flex h-9 items-center whitespace-nowrap text-sm font-medium leading-[21px]'
                            }
                          >
                            {displayName}
                          </p>
                        </div>
                        <div className="ml-[18px] mt-[11px] flex w-[99px] flex-col items-center text-center text-xs">
                          <p className="flex h-6 items-center leading-6 text-muted-foreground">
                            {t('inviteReferral.records.task')}
                          </p>
                          <p className="flex h-6 items-center leading-6">
                            {item.task_text}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end">
                        <p className="flex h-9 items-center whitespace-nowrap text-xs leading-[17px] text-muted-foreground">
                          {format(
                            new Date(item.completed_at),
                            'yyyy-MM-dd HH:mm:ss'
                          )}
                        </p>
                        <div className="mt-[11px] flex w-[113px] flex-col items-center text-center text-xs">
                          <p className="flex h-6 items-center leading-6 text-muted-foreground">
                            {t('inviteReferral.records.rewardColumn')}
                          </p>
                          <p className="flex h-6 items-center leading-6">
                            {item.reward_text}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {loadingMore ? (
              <div className="flex justify-center py-4">
                <Spinner className="size-5 text-muted-foreground" />
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
