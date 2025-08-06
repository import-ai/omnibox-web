import axios from 'axios';
import useApp from './use-app';
import App from '@/hooks/app.class';
import { http } from '@/lib/request';
import { SITE_NAME } from '@/const';
import { Resource } from '@/interface';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';

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
        if (err && err.status && err.status === 403) {
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
      document.title = SITE_NAME;
      return;
    }
    document.title = resource.name ? resource.name : t('untitled');
  }, [resource]);

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
