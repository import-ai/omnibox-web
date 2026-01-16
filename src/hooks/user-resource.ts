import axios from 'axios';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useParams } from 'react-router-dom';

import { SITE_NAME } from '@/const';
import App from '@/hooks/app.class';
import { Resource } from '@/interface';
import { http } from '@/lib/request';
import { setDocumentTitle } from '@/lib/utils';

import useApp from './use-app';

export interface IUseResource {
  app: App;
  editPage: boolean;
  loading: boolean;
  forbidden: boolean;
  resourceId: string;
  namespaceId: string;
  resource: Resource | null;
  onResource: (resource: Resource) => void;
}

export default function useResource() {
  const app = useApp();
  const loc = useLocation();
  const params = useParams();
  const { t } = useTranslation();
  const editPage = loc.pathname.endsWith('/edit');
  const resourceId = params.resource_id || '';
  const namespaceId = params.namespace_id || '';
  const [loading, onLoading] = useState(false);
  const [forbidden, onForbidden] = useState(false);
  const [resource, onResource] = useState<Resource | null>(null);

  useEffect(() => {
    if (!resourceId) {
      return;
    }
    onLoading(true);
    onForbidden(false);
    const source = axios.CancelToken.source();
    http
      .get(`/namespaces/${namespaceId}/resources/${resourceId}`, {
        mute: true,
        cancelToken: source.token,
      })
      .then(onResource)
      .catch(err => {
        if (err.response.data.code === 'not_authorized') {
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
    if (!resource) {
      setDocumentTitle(SITE_NAME);
      return;
    }
    setDocumentTitle(resource.name ? resource.name : t('untitled'));
  }, [resource]);

  // Monitor the update_resource event and synchronize the update of the resource name on the current page
  useEffect(() => {
    return app.on('update_resource', (delta: Resource) => {
      if (!resource) return;

      const isCurrentResource = delta.id === resourceId;
      const isInPath = resource.path?.some(item => item.id === delta.id);

      if (!isCurrentResource && !isInPath) return;

      const newName = delta.name ?? '';
      const updatedPath = resource.path?.map(item =>
        item.id === delta.id ? { ...item, name: newName } : item
      );

      onResource({
        ...resource,
        ...(isCurrentResource && { name: delta.name, content: delta.content }),
        path: updatedPath,
      });
    });
  }, [app, resourceId, resource]);

  return {
    app,
    loading,
    editPage,
    forbidden,
    resource,
    onResource,
    namespaceId,
    resourceId,
  };
}
