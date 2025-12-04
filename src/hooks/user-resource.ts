import axios from 'axios';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useParams } from 'react-router-dom';

import { SITE_NAME } from '@/const';
import App from '@/hooks/app.class';
import { Resource } from '@/interface';
import { http } from '@/lib/request';

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
      document.title = SITE_NAME;
      return;
    }
    document.title = resource.name ? resource.name : t('untitled');
  }, [resource]);

  // 监听 update_resource 事件，同步更新当前页面的资源名称
  useEffect(() => {
    return app.on('update_resource', (delta: Resource) => {
      if (delta.id === resourceId && resource) {
        onResource({
          ...resource,
          name: delta.name,
          content: delta.content,
        });
      }
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
