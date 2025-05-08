import useApp from './use-app';
import App from '@/hooks/app.class';
import { http } from '@/lib/request';
import { Resource } from '@/interface';
import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';

export interface IUseResource {
  app: App;
  resource_id: string;
  resource: Resource | null;
}

export default function useResource() {
  const app = useApp();
  const params = useParams();
  const resource_id = params.resource_id || '';
  const [resource, onResource] = useState<Resource | null>(null);

  useEffect(() => {
    return app.on('resource_update', onResource);
  }, []);

  useEffect(() => {
    if (!resource_id) {
      return;
    }
    // 加载中
    onResource({
      id: '--',
      name: 'loading',
      parent_id: '',
      resource_type: 'doc',
      space_type: 'private',
      child_count: 0,
      namespace: { id: '--' },
    });
    http.get(`/resources/${resource_id}`).then(onResource);
  }, [resource_id]);

  return { app, resource, resource_id };
}
