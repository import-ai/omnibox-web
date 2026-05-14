import { useEffect, useState } from 'react';

import { fetchTrashRetentionDays } from '@/service/usage';

export function useTrashRetentionDays(namespaceId: string, enabled: boolean) {
  const [trashRetentionDays, setTrashRetentionDays] = useState<number>(7);

  useEffect(() => {
    if (!enabled || !namespaceId) return;

    const controller = new AbortController();
    fetchTrashRetentionDays(namespaceId, controller.signal)
      .then(response => {
        setTrashRetentionDays(response.trash_retention_days ?? 7);
      })
      .catch(() => {
        //
      });

    return () => {
      controller.abort();
    };
  }, [enabled, namespaceId]);

  return trashRetentionDays;
}
