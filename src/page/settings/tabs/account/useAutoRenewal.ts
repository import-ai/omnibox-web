import axios from 'axios';
import { type MutableRefObject, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { http } from '@/lib/request';
import { useSettingsToast } from '@/page/settings/SettingsToastProvider';

import { type AutoRenewal } from './autoRenewal';

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 30;

function useAutoRenewalData(namespaceId: string, tier: AutoRenewal['tier']) {
  const [renewal, setRenewal] = useState<AutoRenewal | null>(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    const source = axios.CancelToken.source();
    setLoading(true);
    http
      .get<AutoRenewal | null>(`/namespaces/${namespaceId}/auto-renewal`, {
        cancelToken: source.token,
        params: { tier },
      })
      .then((data: AutoRenewal | null) => {
        setRenewal(data);
        setPolling(data?.status === 'canceling');
      })
      .catch(error => {
        if (!axios.isCancel(error)) setRenewal(null);
      })
      .finally(() => setLoading(false));
    return () => source.cancel();
  }, [namespaceId, tier]);

  return { loading, polling, renewal, setPolling, setRenewal };
}

function useAutoRenewalPolling(
  namespaceId: string,
  tier: AutoRenewal['tier'],
  polling: boolean,
  setRenewal: (renewal: AutoRenewal | null) => void,
  setPolling: (polling: boolean) => void,
  cancellationRequested: MutableRefObject<boolean>
) {
  const { t } = useTranslation();
  const { showToast } = useSettingsToast();

  useEffect(() => {
    if (!polling) return;

    const source = axios.CancelToken.source();
    let attempts = 0;
    let timeout: number | undefined;
    const poll = async () => {
      attempts += 1;
      try {
        const data = await http.get<AutoRenewal | null>(
          `/namespaces/${namespaceId}/auto-renewal`,
          { cancelToken: source.token, mute: true, params: { tier } }
        );
        setRenewal(data);
        if (data?.status !== 'canceling') {
          setPolling(false);
          if (cancellationRequested.current && data?.status === 'canceled') {
            showToast(t('namespace.auto_renewal.cancel_success'), 'success');
          }
          cancellationRequested.current = false;
          return;
        }
      } catch (error) {
        if (!axios.isCancel(error)) {
          setPolling(false);
          cancellationRequested.current = false;
          showToast(t('namespace.auto_renewal.cancel_failed'), 'error');
        }
        return;
      }

      if (attempts >= MAX_POLL_ATTEMPTS) {
        setPolling(false);
        cancellationRequested.current = false;
        showToast(t('namespace.auto_renewal.cancel_timeout'), 'error');
        return;
      }
      timeout = window.setTimeout(poll, POLL_INTERVAL_MS);
    };
    timeout = window.setTimeout(poll, POLL_INTERVAL_MS);

    return () => {
      window.clearTimeout(timeout);
      source.cancel();
    };
  }, [namespaceId, polling, showToast, t, tier]);
}

export function useAutoRenewal(namespaceId: string, tier: AutoRenewal['tier']) {
  const data = useAutoRenewalData(namespaceId, tier);
  const [canceling, setCanceling] = useState(false);
  const cancellationRequested = useRef(false);
  useAutoRenewalPolling(
    namespaceId,
    tier,
    data.polling,
    data.setRenewal,
    data.setPolling,
    cancellationRequested
  );

  const cancel = async (renewal: AutoRenewal) => {
    setCanceling(true);
    cancellationRequested.current = true;
    try {
      const response = await http.post<AutoRenewal>(
        `/namespaces/${namespaceId}/auto-renewal/cancel`,
        undefined,
        { params: { tier: renewal.tier } }
      );
      data.setRenewal(response);
      data.setPolling(response.status === 'canceling');
      return true;
    } catch (error) {
      cancellationRequested.current = false;
      if (!axios.isCancel(error)) data.setPolling(false);
      return false;
    } finally {
      setCanceling(false);
    }
  };

  return { ...data, cancel, canceling };
}
