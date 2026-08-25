import { useEffect, useRef, useState } from 'react';

import {
  applyResourceUpdateDelta,
  isCurrentResourceDeleted,
  isNotFoundResourceError,
  RESOURCE_CONTENT_UPDATE_EVENTS,
  shouldRefetchResourceContent,
} from '@/hooks/resourceUpdateEvent';
import useApp from '@/hooks/useApp';
import { Resource } from '@/interface';
import ResourceDetailView from '@/page/resource/ResourceDetailView';
import { fetchResource } from '@/service/resource';

interface CitationResourcePreviewProps {
  namespaceId: string;
  resourceId: string;
  /** Parent Workspace already provides page padding + gutter. */
  flush?: boolean;
}

type PreviewStatus = 'error' | 'forbidden' | 'loading' | 'notFound' | 'ready';

interface PreviewState {
  resource: Resource | null;
  resourceId: string;
  status: PreviewStatus;
}

function createLoadingState(resourceId: string): PreviewState {
  return { resource: null, resourceId, status: 'loading' };
}

export default function CitationResourcePreview({
  namespaceId,
  resourceId,
  flush = false,
}: CitationResourcePreviewProps) {
  const app = useApp();
  const [previewState, setPreviewState] = useState<PreviewState>(() =>
    createLoadingState(resourceId)
  );
  const resourceRequest = useRef<AbortController | null>(null);
  const currentState =
    previewState.resourceId === resourceId
      ? previewState
      : createLoadingState(resourceId);

  useEffect(() => {
    resourceRequest.current?.abort();
    const controller = new AbortController();
    resourceRequest.current = controller;
    setPreviewState(createLoadingState(resourceId));
    fetchResource(namespaceId, resourceId, controller.signal)
      .then((response: Resource) => {
        if (!controller.signal.aborted) {
          setPreviewState({ resource: response, resourceId, status: 'ready' });
        }
      })
      .catch(requestError => {
        if (controller.signal.aborted) return;
        if (requestError?.response?.status === 404) {
          setPreviewState({ resource: null, resourceId, status: 'notFound' });
        } else if (requestError?.response?.data?.code === 'not_authorized') {
          setPreviewState({ resource: null, resourceId, status: 'forbidden' });
        } else {
          setPreviewState({ resource: null, resourceId, status: 'error' });
        }
      })
      .finally(() => {
        if (resourceRequest.current === controller) {
          resourceRequest.current = null;
        }
      });
    return () => {
      controller.abort();
      if (resourceRequest.current === controller) {
        resourceRequest.current = null;
      }
    };
  }, [namespaceId, resourceId]);

  useEffect(() => {
    const handleResourceEvent = (delta: Resource | string) => {
      if (shouldRefetchResourceContent(delta, resourceId)) {
        resourceRequest.current?.abort();
        const controller = new AbortController();
        resourceRequest.current = controller;
        fetchResource(namespaceId, resourceId, controller.signal)
          .then(updated => {
            if (controller.signal.aborted) return;
            setPreviewState(current =>
              current.resourceId === resourceId && current.status !== 'notFound'
                ? { resource: updated, resourceId, status: 'ready' }
                : current
            );
          })
          .catch(error => {
            if (controller.signal.aborted) return;
            if (isNotFoundResourceError(error)) {
              setPreviewState(current =>
                current.resourceId === resourceId
                  ? { resource: null, resourceId, status: 'notFound' }
                  : current
              );
            }
          })
          .finally(() => {
            if (resourceRequest.current === controller) {
              resourceRequest.current = null;
            }
          });
        return;
      }

      if (typeof delta === 'string') return;
      setPreviewState(current => {
        if (
          current.resourceId !== resourceId ||
          !current.resource ||
          current.status === 'notFound'
        ) {
          return current;
        }
        const next = applyResourceUpdateDelta(
          current.resource,
          delta,
          resourceId
        );
        return next === current.resource
          ? current
          : { ...current, resource: next };
      });
    };

    const handleDeletedResource = (id: string) => {
      if (!isCurrentResourceDeleted(id, resourceId)) return;
      resourceRequest.current?.abort();
      setPreviewState(current =>
        current.resourceId === resourceId
          ? { resource: null, resourceId, status: 'notFound' }
          : current
      );
    };

    const unbind = [
      ...RESOURCE_CONTENT_UPDATE_EVENTS.map(event =>
        app.on(event, handleResourceEvent)
      ),
      app.on('delete_resource', handleDeletedResource),
    ];

    return () => {
      resourceRequest.current?.abort();
      unbind.forEach(off => off());
    };
  }, [app, namespaceId, resourceId]);

  return (
    <ResourceDetailView
      app={app}
      editPage={false}
      error={currentState.status === 'error'}
      flush={flush}
      forbidden={currentState.status === 'forbidden'}
      loading={currentState.status === 'loading'}
      namespaceId={namespaceId}
      notFound={currentState.status === 'notFound'}
      onResource={resource => {
        resourceRequest.current?.abort();
        setPreviewState({ resource, resourceId, status: 'ready' });
      }}
      resource={currentState.resource}
      resourceId={resourceId}
    />
  );
}
