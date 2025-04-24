import useApp from './use-app';
import App from '@/hooks/app.class';
import { Resource } from '@/interface';
import { useState, useEffect } from 'react';

export interface IUseResource {
  app: App;
  resource: Resource | null;
  onResource: (resource: Resource) => void;
}

export default function useResource() {
  const app = useApp();
  const [resource, onResource] = useState<Resource | null>(null);

  useEffect(() => {
    return app.on('resource', onResource);
  }, []);

  return { app, resource, onResource };
}
