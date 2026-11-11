import { format } from 'date-fns';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/omnibox/Select';
import { SettingPageButton } from '@/components/omnibox/SettingPageButton';
import PaginationMain from '@/components/pagination';
import { Spinner } from '@/components/ui/Spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { http } from '@/lib/request';

import { formatCreditAmount } from './utils';

interface Activity {
  id: string;
  event_type: string;
  thinking_level?: string | null;
  occurred_at: string;
  amount: number;
}

export function CreditActivity({ namespaceId }: { namespaceId: string }) {
  const { t } = useTranslation();
  const [scope, setScope] = useState<'own' | 'all'>('own');
  const [canViewAll, setCanViewAll] = useState(false);
  const [page, setPage] = useState(1);
  const tableRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (tableRef.current) tableRef.current.scrollTop = 0;
  }, [namespaceId, page]);
  const [data, setData] = useState<{ items: Activity[]; total: number } | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    http
      .get(`/namespaces/${namespaceId}/usages/credits/activity`, {
        params: { offset: (page - 1) * 20, limit: 20, scope },
        signal: controller.signal,
      })
      .then(
        (result: {
          items: Activity[];
          total: number;
          can_view_all?: boolean;
        }) => {
          if (!controller.signal.aborted) {
            setData(result);
            setCanViewAll(result.can_view_all === true);
            if (!result.can_view_all) setScope('own');
          }
        }
      )
      .catch(() => {
        if (!controller.signal.aborted) setData(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [namespaceId, page, refresh, scope]);
  return (
    <section
      className="mt-5 border-t border-border pt-5 text-foreground"
      aria-busy={loading}
    >
      <h3 className="mb-3 text-sm font-medium">{t('quota.ledger_title')}</h3>
      <div className="mb-3 flex items-center justify-between gap-2">
        {canViewAll ? (
          <Select
            value={scope}
            onValueChange={(value: 'own' | 'all') => {
              setScope(value);
              setPage(1);
            }}
            disabled={loading}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="own">{t('quota.my_activity')}</SelectItem>
              <SelectItem value="all">{t('quota.all_activity')}</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <span className="text-sm text-muted-foreground">
            {t('quota.my_activity')}
          </span>
        )}
        <SettingPageButton
          disabled={loading}
          onClick={() => setRefresh(value => value + 1)}
        >
          {t('common.refresh')}
        </SettingPageButton>
      </div>
      <div
        ref={tableRef}
        className="h-[260px] overflow-auto rounded-md border border-border [&>[data-slot=table-container]]:overflow-visible"
      >
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow>
              <TableHead>{t('quota.ledger_detail')}</TableHead>
              <TableHead className="text-right">
                {t('quota.ledger_change')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={2} className="h-40 text-center">
                  <Spinner className="mx-auto size-5 text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : !data ? (
              <TableRow>
                <TableCell colSpan={2} className="h-40 text-center">
                  <p className="mb-2 text-sm text-muted-foreground">
                    {t('quota.ledger_failed')}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRefresh(value => value + 1)}
                  >
                    {t('retry')}
                  </Button>
                </TableCell>
              </TableRow>
            ) : data.items.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={2}
                  className="h-40 text-center text-muted-foreground"
                >
                  {t('quota.ledger_empty')}
                </TableCell>
              </TableRow>
            ) : (
              data.items.map(item => (
                <TableRow key={item.id} className="h-[68px]">
                  <TableCell>
                    <p className="text-sm leading-[21px]">
                      {t(`quota.activity_types.${item.event_type}`)}
                      {item.event_type === 'agent' && item.thinking_level && (
                        <>
                          {' '}
                          {t('quota.activity_thinking', {
                            level: t(`chat.thinking.${item.thinking_level}`, {
                              defaultValue: item.thinking_level,
                            }),
                          })}
                        </>
                      )}
                    </p>
                    <time
                      className="mt-1 block text-xs leading-[18px] text-muted-foreground"
                      dateTime={item.occurred_at}
                    >
                      {format(
                        new Date(item.occurred_at),
                        'yyyy-MM-dd HH:mm:ss'
                      )}
                    </time>
                  </TableCell>
                  <TableCell
                    className={`text-right text-sm font-medium tabular-nums ${item.amount > 0 ? 'text-blue-500' : ''}`}
                  >
                    {item.amount > 0 ? '+' : '−'}
                    {formatCreditAmount(Math.abs(item.amount))}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {data && data.total > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2" inert={loading}>
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
    </section>
  );
}
