import axios from 'axios';
import { useEffect, useState } from 'react';

import useApp from '@/hooks/useApp';
import { Resource } from '@/interface';
import { http } from '@/lib/request';
import ResourceDetailView from '@/page/resource/ResourceDetailView';

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
  const currentState =
    previewState.resourceId === resourceId
      ? previewState
      : createLoadingState(resourceId);

  useEffect(() => {
    let active = true;
    const source = axios.CancelToken.source();
    setPreviewState(createLoadingState(resourceId));
    http
      .get(`/namespaces/${namespaceId}/resources/${resourceId}`, {
        cancelToken: source.token,
        mute: true,
      })
      .then((response: Resource) => {
        if (active) {
          setPreviewState({ resource: response, resourceId, status: 'ready' });
        }
      })
      .catch(requestError => {
        if (!active || axios.isCancel(requestError)) return;
        if (requestError?.response?.status === 404) {
          setPreviewState({ resource: null, resourceId, status: 'notFound' });
        } else if (requestError?.response?.data?.code === 'not_authorized') {
          setPreviewState({ resource: null, resourceId, status: 'forbidden' });
        } else {
          setPreviewState({ resource: null, resourceId, status: 'error' });
        }
      });
    return () => {
      active = false;
      source.cancel();
    };
  }, [namespaceId, resourceId]);

  useEffect(() => {
    return app.on('update_resource', (delta: Resource) => {
      if (delta.id !== resourceId) return;
      setPreviewState(current =>
        current.resourceId === resourceId && current.resource
          ? { ...current, resource: { ...current.resource, ...delta } }
          : current
      );
    });
  }, [app, resourceId]);

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
      onResource={resource =>
        setPreviewState({ resource, resourceId, status: 'ready' })
      }
      resource={currentState.resource}
      resourceId={resourceId}
    />
  );
}
