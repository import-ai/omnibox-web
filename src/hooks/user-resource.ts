import useApp from './use-app';
import App from '@/hooks/app.class';
import { http } from '@/lib/request';
import { Resource } from '@/interface';
import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';

export interface IUseResource {
  app: App;
  loading: boolean;
  resource_id: string;
  namespace_id: string;
  resource: Resource | null;
}

export default function useResource() {
  const app = useApp();
  const params = useParams();
  const [loading, onLoading] = useState(false);
  const resource_id = params.resource_id || '';
  const namespace_id = params.namespace_id || '';
  const [resource, onResource] = useState<Resource | null>(null);

  useEffect(() => {
    return app.on('resource_update', onResource);
  }, []);

  useEffect(() => {
    if (!resource_id) {
      return;
    }
    onLoading(true);
    http
      .get(`/namespaces/${namespace_id}/resources/${resource_id}`)
      .then(onResource)
      .finally(() => {
        onLoading(false);
      });
  }, [resource_id]);

  return { app, loading, resource, namespace_id, resource_id };
}
