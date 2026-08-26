import axios from 'axios';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import useConfig from '@/hooks/useConfig';
import { http } from '@/lib/request';

import { type AutoRenewal, getAutoRenewalView } from './autoRenewal';
import { AutoRenewalCard } from './AutoRenewalSection';

function CommercialAutoRenewals() {
  const { t } = useTranslation();
  const [renewals, setRenewals] = useState<AutoRenewal[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelingId, setCancelingId] = useState<string>();

  useEffect(() => {
    const source = axios.CancelToken.source();
    http
      .get<AutoRenewal[]>('/auto-renewals', { cancelToken: source.token })
      .then(setRenewals)
      .finally(() => setLoading(false));
    return () => source.cancel();
  }, []);

  const cancel = async (renewal: AutoRenewal) => {
    setCancelingId(renewal.id);
    try {
      const updated = await http.post<AutoRenewal>(
        `/auto-renewals/${renewal.id}/cancel`
      );
      setRenewals(current =>
        current.map(item => (item.id === updated.id ? updated : item))
      );
      return true;
    } catch {
      return false;
    } finally {
      setCancelingId(undefined);
    }
  };

  const visible = renewals.filter(renewal => getAutoRenewalView(renewal));
  if (!loading && visible.length === 0) return null;

  return (
    <div className="mt-4 w-full">
      <h3 className="w-full border-b pb-2 font-semibold text-foreground lg:text-xl">
        {t('setting.auto_renewal_management')}
      </h3>
      {loading ? (
        <div className="mt-4 h-16 animate-pulse rounded bg-muted" />
      ) : (
        visible.map(renewal => (
          <AutoRenewalCard
            key={renewal.id}
            cancel={cancel}
            canceling={cancelingId === renewal.id}
            contextLabel={t('namespace.auto_renewal.space', {
              id: renewal.namespace_id || '-',
            })}
            polling={renewal.status === 'canceling'}
            renewal={renewal}
          />
        ))
      )}
    </div>
  );
}

export function AccountAutoRenewals() {
  const { config } = useConfig();
  return config.commercial ? <CommercialAutoRenewals /> : null;
}
