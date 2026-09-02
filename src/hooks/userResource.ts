import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { SITE_NAME } from '@/const';
import type App from '@/hooks/app.class';
import { Resource, ResourceSummary } from '@/interface';
import { setDocumentTitle } from '@/lib/utils';
import { fetchResource } from '@/service/resource';

import {
  applyResourceUpdateDelta,
  isCurrentResourceDeleted,
  isForbiddenResourceError,
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
  const initialResourceRequest = useRef<AbortController | null>(null);
  const resourceEventRequest = useRef<AbortController | null>(null);
  const editPageRef = useRef(editPage);
  editPageRef.current = editPage;

  useEffect(() => {
    if (!resourceId) {
      return;
    }
    onLoading(true);
    onForbidden(false);
    onNotFound(false);
    initialResourceRequest.current?.abort();
    resourceEventRequest.current?.abort();
    const controller = new AbortController();
    initialResourceRequest.current = controller;
    fetchResource(namespaceId, resourceId, controller.signal)
      .then(updated => {
        if (!controller.signal.aborted) {
          onForbidden(false);
          onNotFound(false);
          onResource(updated);
        }
      })
      .catch(err => {
        if (controller.signal.aborted) return;
        if (isNotFoundResourceError(err)) {
          onNotFound(true);
          onForbidden(false);
          onResource(null);
        } else if (isForbiddenResourceError(err)) {
          onForbidden(true);
          onNotFound(false);
          onResource(null);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) onLoading(false);
        if (initialResourceRequest.current === controller) {
          initialResourceRequest.current = null;
        }
      });
    return () => {
      controller.abort();
      if (initialResourceRequest.current === controller) {
        initialResourceRequest.current = null;
      }
    };
  }, [namespaceId, resourceId]);

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
    const handleResourceEvent = (delta: Resource | string) => {
      if (
        shouldRefetchResourceContent(delta, resourceId, !editPageRef.current)
      ) {
        initialResourceRequest.current?.abort();
        resourceEventRequest.current?.abort();
        const controller = new AbortController();
        resourceEventRequest.current = controller;
        fetchResource(namespaceId, resourceId, controller.signal)
          .then(updated => {
            if (controller.signal.aborted) return;
            onNotFound(false);
            onForbidden(false);
            onResource(updated);
          })
          .catch(error => {
            if (controller.signal.aborted) return;
            if (isNotFoundResourceError(error)) {
              onNotFound(true);
              onForbidden(false);
              onResource(null);
            } else if (isForbiddenResourceError(error)) {
              onForbidden(true);
              onNotFound(false);
              onResource(null);
            }
          })
          .finally(() => {
            if (!controller.signal.aborted) onLoading(false);
            if (resourceEventRequest.current === controller) {
              resourceEventRequest.current = null;
            }
          });
        return;
      }

      if (typeof delta === 'string') return;
      onResource(current =>
        current ? applyResourceUpdateDelta(current, delta, resourceId) : current
      );
    };

    const handleDeletedResource = (id: string) => {
      if (!isCurrentResourceDeleted(id, resourceId)) return;
      initialResourceRequest.current?.abort();
      resourceEventRequest.current?.abort();
      onLoading(false);
      onNotFound(true);
    };

    const unbind = [
      ...RESOURCE_CONTENT_UPDATE_EVENTS.map(event =>
        app.on(event, handleResourceEvent)
      ),
      app.on('delete_resource', handleDeletedResource),
    ];

    return () => {
      resourceEventRequest.current?.abort();
      unbind.forEach(off => off());
    };
  }, [app, namespaceId, resourceId]);

  // Permission changes made in another session are picked up when the user
  // returns to the tab or window. The loading state prevents stale content
  // from remaining visible while access is revalidated.
  useEffect(() => {
    if (!resourceId) return;

    const revalidate = () => {
      if (document.visibilityState === 'hidden') return;
      initialResourceRequest.current?.abort();
      resourceEventRequest.current?.abort();
      const controller = new AbortController();
      resourceEventRequest.current = controller;
      onLoading(true);
      onForbidden(false);
      onNotFound(false);
      fetchResource(namespaceId, resourceId, controller.signal)
        .then(updated => {
          if (controller.signal.aborted) return;
          onResource(updated);
        })
        .catch(error => {
          if (controller.signal.aborted) return;
          if (isNotFoundResourceError(error)) {
            onNotFound(true);
            onResource(null);
          } else if (isForbiddenResourceError(error)) {
            onForbidden(true);
            onResource(null);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) onLoading(false);
          if (resourceEventRequest.current === controller) {
            resourceEventRequest.current = null;
          }
        });
    };

    window.addEventListener('focus', revalidate);
    document.addEventListener('visibilitychange', revalidate);
    return () => {
      window.removeEventListener('focus', revalidate);
      document.removeEventListener('visibilitychange', revalidate);
    };
  }, [namespaceId, resourceId]);

  // Monitor the restore_resource event to reload the resource when it's restored from trash
  useEffect(() => {
    return app.on('restore_resource', (restored: Resource) => {
      if (restored.id === resourceId && notFound) {
        initialResourceRequest.current?.abort();
        resourceEventRequest.current?.abort();
        onLoading(false);
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
