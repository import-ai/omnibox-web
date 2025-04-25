import useApp from './use-app';
import App from '@/hooks/app.class';
import { http } from '@/lib/request';
import { Resource } from '@/interface';
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

export interface IUseResource {
  app: App;
  resource: Resource | null;
}

export default function useResource() {
  const app = useApp();
  const params = useParams();
  const resourceId = params.resourceId || '';
  const [resource, onResource] = useState<Resource | null>(null);

  useEffect(() => {
    if (!resourceId || resourceId === 'chat') {
      return;
    }
    http.get(`/resources/${resourceId}`).then(onResource);
  }, [resourceId]);

  return { app, resource };
}
