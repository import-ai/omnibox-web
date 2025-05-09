import { toast } from 'sonner';
import useApp from './use-app';
import { http } from '@/lib/request';
import { Namespace } from '@/interface';
import { useState, useEffect } from 'react';

export default function useNamespaces() {
  const app = useApp();
  const [loading, onLoading] = useState(false);
  const [data, onData] = useState<Array<Namespace>>([]);
  const refetch = () => {
    onLoading(true);
    // 未登陆不请求数据
    if (!localStorage.getItem('uid')) {
      return;
    }
    http
      .get('namespaces/user')
      .then(onData)
      .catch((err) => {
        toast(err && err.message ? err.message : err, {
          position: 'top-center',
        });
      })
      .finally(() => {
        onLoading(false);
      });
  };

  useEffect(refetch, []);

  useEffect(() => {
    return app.on('namespaces_refetch', refetch);
  }, []);

  return { app, data, loading };
}
