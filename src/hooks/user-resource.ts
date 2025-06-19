import useApp from './use-app';
import App from '@/hooks/app.class';
import { http } from '@/lib/request';
import { SITE_NAME } from '@/const';
import { Resource } from '@/interface';
import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export interface IUseResource {
  app: App;
  loading: boolean;
  forbidden: boolean;
  resourceId: string;
  namespaceId: string;
  resource: Resource | null;
}

export default function useResource() {
  const app = useApp();
  const params = useParams();
  const { t } = useTranslation();
  const resourceId = params.resource_id || '';
  const namespaceId = params.namespace_id || '';
  const [loading, onLoading] = useState(false);
  const [forbidden, onForbidden] = useState(false);
  const [resource, onResource] = useState<Resource | null>(null);

  useEffect(() => {
    return app.on('resource_update', onResource);
  }, []);

  useEffect(() => {
    if (!resourceId) {
      return;
    }
    onLoading(true);
    onForbidden(false);
    http
      .get(`/namespaces/${namespaceId}/resources/${resourceId}`, {
        mute: true,
      })
      .then(onResource)
      .catch((err) => {
        if (err && err.status && err.status === 403) {
          onForbidden(true);
        }
      })
      .finally(() => {
        onLoading(false);
      });
  }, [resourceId]);

  useEffect(() => {
    if (!resource) {
      document.title = SITE_NAME;
      return;
    }
    document.title = resource.name ? resource.name : t('untitled');
  }, [resource]);

  return { app, loading, forbidden, resource, namespaceId, resourceId };
}
