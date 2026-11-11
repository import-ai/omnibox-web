import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';
import PaginationMain from '@/components/pagination';
import { Spinner } from '@/components/ui/Spinner';
import { http } from '@/lib/request';

import { formatCreditAmount } from './utils';

interface Activity {
  id: string;
  event_type: string;
  occurred_at: string;
  amount: number;
}

export function CreditActivity({ namespaceId }: { namespaceId: string }) {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: Activity[]; total: number } | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const onFocus = () => setRefresh(value => value + 1);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    http
      .get(`/namespaces/${namespaceId}/usages/credits/activity`, {
        params: { offset: (page - 1) * 20, limit: 20 },
        signal: controller.signal,
      })
      .then((result: { items: Activity[]; total: number }) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch(() => {
        if (!controller.signal.aborted) setData(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [namespaceId, page, refresh]);
  return (
    <section
      className="mt-5 border-t border-border pt-5 text-foreground"
      aria-busy={loading}
    >
      <h3 className="mb-3 text-sm font-medium">{t('quota.ledger_title')}</h3>
      {loading ? (
        <Spinner className="mx-auto my-6 size-5 text-muted-foreground" />
      ) : !data ? (
        <p className="text-sm text-muted-foreground">
          {t('quota.ledger_failed')}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRefresh(value => value + 1)}
          >
            {t('retry')}
          </Button>
        </p>
      ) : (
        <>
          {data.items.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {t('quota.ledger_empty')}
            </p>
          )}
          <ul className="divide-y divide-border">
            {data.items.map(item => (
              <li
                key={item.id}
                className="flex items-start justify-between gap-4 py-3"
              >
                <div className="min-w-0 space-y-1">
                  <p className="text-sm">
                    {t(`quota.activity_types.${item.event_type}`)}
                  </p>
                  <time
                    className="text-xs text-muted-foreground"
                    dateTime={item.occurred_at}
                  >
                    {format(new Date(item.occurred_at), 'yyyy-MM-dd HH:mm:ss')}
                  </time>
                </div>
                <span
                  className={`text-sm font-medium tabular-nums ${item.amount > 0 ? 'text-blue-500' : ''}`}
                >
                  {item.amount > 0 ? '+' : '−'}
                  {formatCreditAmount(Math.abs(item.amount))}
                </span>
              </li>
            ))}
          </ul>
          {data.total > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {t('quota.ledger_total', { total: data.total })}
              </span>
              <PaginationMain
                total={data.total}
                current={page}
                pageSize={20}
                onChange={setPage}
              />
            </div>
          )}
        </>
      )}
    </section>
  );
}
