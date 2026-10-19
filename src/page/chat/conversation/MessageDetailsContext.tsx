import { createContext, useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import type { MessageDetail } from '@/page/chat/core/types/conversation';

type Loader = (
  ids: string[]
) => Promise<Record<string, MessageDetail | undefined>>;
export const MessageDetailsContext = createContext<Loader | undefined>(
  undefined
);

export function useMessageDetails() {
  const loader = useContext(MessageDetailsContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  async function load(ids: string[]) {
    if (!loader) return;
    setLoading(true);
    setError(false);
    try {
      return await loader(ids);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }
  return { load, loading, error };
}

export function DetailLoadState({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error: boolean;
  retry: () => void;
}) {
  const { t } = useTranslation();
  if (error)
    return (
      <Button variant="outline" size="sm" onClick={retry}>
        {t('chat.history.retry_details')}
      </Button>
    );
  return loading ? (
    <p role="status">{t('chat.history.loading_details')}</p>
  ) : null;
}

export function useCitationDetails(
  citation: import('@/page/chat/core/types/chatResponse').Citation
) {
  const details = useMessageDetails();
  const [loaded, setLoaded] = useState<typeof citation>();
  const load = async () => {
    if (!citation.source_message_id) return;
    const result = await details.load([citation.source_message_id]);
    const full = result?.[citation.source_message_id]?.attrs?.citations?.find(
      item => item.id === citation.id
    );
    if (full) setLoaded({ ...citation, ...full });
  };
  return {
    ...details,
    load,
    citation:
      loaded?.id === citation.id &&
      loaded.source_message_id === citation.source_message_id
        ? loaded
        : citation,
  };
}
