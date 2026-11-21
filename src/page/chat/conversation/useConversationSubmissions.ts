import { useCallback, useEffect, useRef, useState } from 'react';

import { http } from '@/lib/request';

interface Receipt {
  disposition: 'queued' | 'steered' | 'started' | 'failed';
  client_request_id: string;
  id?: string;
  query?: string;
  error?: string;
}

export default function useConversationSubmissions(
  url: string,
  scope: string,
  onDelivered: (receipt: Receipt) => Promise<void>
) {
  const [state, setState] = useState<{ scope: string; entries: Receipt[] }>({
    scope,
    entries: [],
  });
  const receipts = state.scope === scope ? state.entries : [];
  const live = useRef(scope);
  live.current = scope;
  const setReceipts = useCallback(
    (apply: (items: Receipt[]) => Receipt[]) => {
      if (live.current === scope)
        setState(prev => ({
          scope,
          entries: apply(prev.scope === scope ? prev.entries : []),
        }));
    },
    [scope]
  );
  const current = useRef(onDelivered);
  current.current = onDelivered;
  const remember = useCallback(
    (receipt: Receipt) => {
      setReceipts(previous => [
        ...previous.filter(
          item => item.client_request_id !== receipt.client_request_id
        ),
        receipt,
      ]);
    },
    [setReceipts]
  );
  useEffect(() => {
    let active = true;
    setReceipts(() => []);
    const restore = async () => {
      const pending = await http.get(url, { mute: true });
      if (active && Array.isArray(pending)) pending.forEach(remember);
    };
    const restoreOnline = () => {
      void restore().catch(() => undefined);
    };
    restoreOnline();
    window.addEventListener('online', restoreOnline);
    return () => {
      active = false;
      window.removeEventListener('online', restoreOnline);
    };
  }, [url, remember, setReceipts]);

  useEffect(() => {
    const waiting = receipts.filter(item => item.disposition !== 'failed');
    if (!waiting.length) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      for (const item of waiting) {
        if (!active) return;
        try {
          const result: Receipt =
            item.disposition === 'queued'
              ? await http.get(url, {
                  params: { id: item.client_request_id },
                  mute: true,
                })
              : item;
          if (!active) return;
          if (result.disposition === 'queued') continue;
          if (result.disposition === 'failed') {
            remember(result);
            continue;
          }
          await current.current(result);
          if (active)
            setReceipts(previous =>
              previous.filter(
                r => r.client_request_id !== result.client_request_id
              )
            );
        } catch {
          // The submission is already on the server. Retry only the receipt read.
        }
      }
      if (active) timer = setTimeout(poll, 1200);
    };
    timer = setTimeout(poll, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [url, receipts, remember, setReceipts]);
  return { receipts, remember };
}
