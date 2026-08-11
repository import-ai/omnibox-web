import { useCallback, useEffect, useRef, useState } from 'react';

import { hasFailedTasks } from '@/components/attributes/resource-tasks/utils';
import { fetchResourceTasks } from '@/service/resource';

interface IProps {
  namespaceId: string;
  resourceId?: string;
  disabled?: boolean;
}

/**
 * Tells whether the resource has any failed task left to retry, so the toolbar
 * can offer a retry only when there is something to retry. The sidebar has no
 * task status, which is why this lives on the resource page.
 */
export default function useResourceFailedTasks(props: IProps) {
  const { namespaceId, resourceId, disabled = false } = props;
  const mountedRef = useRef(false);
  const [failed, onFailed] = useState(false);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(() => {
    if (disabled || !namespaceId || !resourceId) {
      onFailed(false);
      return;
    }
    fetchResourceTasks(namespaceId, resourceId, { mute: true })
      .then(tasks => {
        if (mountedRef.current) {
          onFailed(hasFailedTasks(tasks || []));
        }
      })
      .catch(() => undefined);
  }, [disabled, namespaceId, resourceId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { failed, refresh };
}
