import { useMemo } from 'react';

import useRssFolderLimits from '@/hooks/useRssFolderLimits';
import { useSidebarStore } from '@/page/sidebar/store';

import {
  countRssFoldersBySpace,
  getRssFolderQuotaExhausted,
  type RssFolderQuotaExhausted,
} from '../rssFolderQuota';

/**
 * Whether each space has run out of RSS folder quota, from the limits API
 * reconciled with the folders already loaded into the tree. The sidebar body
 * and the node menu both gate "create RSS folder" on this, so they read one
 * answer instead of recomputing it from the same two inputs.
 */
export function useRssFolderQuotaExhausted(
  namespaceId?: string
): RssFolderQuotaExhausted {
  const { data: rssFolderLimits } = useRssFolderLimits({ namespaceId });
  const nodes = useSidebarStore(state => state.nodes);
  const localCounts = useMemo(() => countRssFoldersBySpace(nodes), [nodes]);

  return useMemo(
    () => getRssFolderQuotaExhausted(rssFolderLimits, localCounts),
    [rssFolderLimits, localCounts]
  );
}
