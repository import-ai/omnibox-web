import useApp from './use-app';
import App from '@/hooks/app.class';
import { http } from '@/lib/request';
import { Resource } from '@/interface';
import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';

export interface IUseResource {
  app: App;
  resourceId: string;
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

  return { app, resource, resourceId };
}
