import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import useApp from '@/hooks/useApp';
import { http } from '@/lib/request';
import { useSidebarStore } from '@/page/sidebar/store';

import type { CreateRssFolderPayload, RssFolderResponse } from './index';

/**
 * The read/write half of the rss folder config dialog, shared by the sidebar
 * node menu and the resource toolbar. Both open the same dialog and expect the
 * same effects (rename in the tree, resource event, toast); only where they
 * keep the dialog's open state differs, so that stays with the caller.
 */
export function useRssFolderConfig(namespaceId: string) {
  const app = useApp();
  const { t } = useTranslation();

  // The initial values for the edit dialog.
  const loadRssFolderConfig = useCallback(
    (resourceId: string): Promise<CreateRssFolderPayload> =>
      http
        .get(`/namespaces/${namespaceId}/rss-folders/${resourceId}/config`)
        .then((response: RssFolderResponse) => ({
          name: response.resource.name || '',
          links: (response.links || []).map(link => ({
            url: link.url,
            name: link.name,
          })),
        })),
    [namespaceId]
  );

  const updateRssFolderConfig = useCallback(
    (resourceId: string, payload: CreateRssFolderPayload): Promise<void> =>
      http
        .patch(
          `/namespaces/${namespaceId}/rss-folders/${resourceId}/config`,
          payload,
          // The dialog renders a per-link error for an unreachable feed, so the
          // generic error toast would be a duplicate.
          { muteCodes: ['rss_feed_invalid'] }
        )
        .then((response: RssFolderResponse) => {
          useSidebarStore
            .getState()
            .patch(resourceId, { name: response.resource.name });
          app.fire('update_resource', response.resource);
          toast.success(t('rss_folder.edit.success'));
        }),
    [app, namespaceId, t]
  );

  return { loadRssFolderConfig, updateRssFolderConfig };
}
