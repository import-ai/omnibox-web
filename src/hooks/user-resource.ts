import useApp from './use-app';
import App from '@/hooks/app.class';
import { http } from '@/lib/request';
import { Resource } from '@/interface';
import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export interface IUseResource {
  app: App;
  resourceId: string;
  resource: Resource | null;
}

export default function useResource() {
  const app = useApp();
  const params = useParams();
  const { t } = useTranslation();
  const resourceId = params.resourceId || '';
  const [resource, onResource] = useState<Resource | null>(null);

  useEffect(() => {
    return app.on('resource_update', onResource);
  }, []);

  useEffect(() => {
    if (!resourceId) {
      return;
    }
    if (resourceId === 'chat') {
      onResource({
        id: 'chat',
        name: t('chat'),
        parentId: '',
        resourceType: 'doc',
        spaceType: 'private',
        childCount: 0,
        namespace: { id: '--' },
      });
      return;
    }
    // 加载中
    onResource({
      id: '--',
      name: 'loading',
      parentId: '',
      resourceType: 'doc',
      spaceType: 'private',
      childCount: 0,
      namespace: { id: '--' },
    });
    http.get(`/resources/${resourceId}`).then(onResource);
  }, [resourceId]);

  return { app, resource, resourceId };
}
