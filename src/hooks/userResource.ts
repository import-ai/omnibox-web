import axios from 'axios';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { SITE_NAME } from '@/const';
import type App from '@/hooks/app.class';
import { Resource, ResourceSummary } from '@/interface';
import { http } from '@/lib/request';
import { setDocumentTitle } from '@/lib/utils';
import { fetchResource } from '@/service/resource';

import {
  applyResourceUpdateDelta,
  isCurrentResourceDeleted,
  isNotFoundResourceError,
  RESOURCE_CONTENT_UPDATE_EVENTS,
  shouldRefetchResourceContent,
} from './resourceUpdateEvent';
import useApp from './useApp';

export interface IUseResource {
  app: App;
  editPage: boolean;
  loading: boolean;
  forbidden: boolean;
  notFound: boolean;
  resourceId: string;
  namespaceId: string;
  resource: Resource | null;
  onResource: (resource: Resource) => void;
}

/** Resolves a title only when the loaded resource belongs to the active route. */
export function resolveResourceDocumentTitle(
  resourceId: string,
  resource: Resource | null,
  untitled: string
) {
  if (!resourceId) return SITE_NAME;
  if (resource?.id !== resourceId) return null;
  return resource.name || untitled;
}

export default function useResource() {
  const app = useApp();
  const loc = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const { t } = useTranslation();
  const editPage = loc.pathname.endsWith('/edit');
  const resourceId = params.resource_id || '';
  const namespaceId = params.namespace_id || '';
  const [loading, onLoading] = useState(false);
  const [forbidden, onForbidden] = useState(false);
  const [notFound, onNotFound] = useState(false);
  const [resource, onResource] = useState<Resource | null>(null);

  useEffect(() => {
    if (!resourceId) {
      return;
    }
    onLoading(true);
    onForbidden(false);
    onNotFound(false);
    const source = axios.CancelToken.source();
    http
      .get(`/namespaces/${namespaceId}/resources/${resourceId}`, {
        mute: true,
        cancelToken: source.token,
      })
      .then(onResource)
      .catch(err => {
        if (err.response?.status === 404) {
          onNotFound(true);
        } else if (err.response?.data?.code === 'not_authorized') {
          onForbidden(true);
        }
      })
      .finally(() => {
        onLoading(false);
      });
    return () => {
      source.cancel();
    };
  }, [resourceId]);

  useEffect(() => {
    const title = resolveResourceDocumentTitle(
      resourceId,
      resource,
      t('untitled')
    );
    if (title !== null) setDocumentTitle(title);
  }, [resource, resourceId, t]);

  // Copilot/agent operations announce an id; local editors send a resource delta.
  useEffect(() => {
    let cancelled = false;
    let currentResourceDeleted = false;

    const handleResourceEvent = (delta: Resource | string) => {
      if (currentResourceDeleted) return;
      if (shouldRefetchResourceContent(delta, resourceId, !editPage)) {
        fetchResource(namespaceId, resourceId)
          .then(updated => {
            if (cancelled || currentResourceDeleted) return;
            onNotFound(false);
            onResource(updated);
          })
          .catch(error => {
            if (cancelled || currentResourceDeleted) return;
            if (isNotFoundResourceError(error)) {
              onNotFound(true);
            }
          });
        return;
      }

      if (typeof delta === 'string' || !resource) return;

      const next = applyResourceUpdateDelta(resource, delta, resourceId);
      if (next !== resource) onResource(next);
    };

    const handleDeletedResource = (id: string) => {
      if (!isCurrentResourceDeleted(id, resourceId)) return;
      currentResourceDeleted = true;
      onNotFound(true);
    };

    const unbind = [
      ...RESOURCE_CONTENT_UPDATE_EVENTS.map(event =>
        app.on(event, handleResourceEvent)
      ),
      app.on('delete_resource', handleDeletedResource),
    ];

    return () => {
      cancelled = true;
      unbind.forEach(off => off());
    };
  }, [app, editPage, namespaceId, resource, resourceId]);

  // Monitor the restore_resource event to reload the resource when it's restored from trash
  useEffect(() => {
    return app.on('restore_resource', (restored: Resource) => {
      if (restored.id === resourceId && notFound) {
        onNotFound(false);
        onResource(restored);
      }
    });
  }, [app, resourceId, notFound]);

  useEffect(() => {
    return app.on(
      'smart_folder_children_updated',
      (parentId: string, children: ResourceSummary[]) => {
        if (!resource || resource.id === parentId || editPage) {
          return;
        }

        const fromCurrentSmartFolder =
          loc.state?.sidebarActiveKey ===
          `smart-folder-child-${parentId}-${resource.id}`;
        if (!fromCurrentSmartFolder) {
          return;
        }

        const stillVisible = children.some(item => item.id === resource.id);
        if (!stillVisible) {
          navigate(`/${namespaceId}/${parentId}`, { replace: true });
        }
      }
    );
  }, [app, editPage, loc.state, namespaceId, navigate, resource]);

  return {
    app,
    loading,
    editPage,
    forbidden,
    notFound,
    resource,
    onResource,
    namespaceId,
    resourceId,
  };
}
