import { useEffect, useState } from 'react';

import { Namespace } from '@/interface';
import { http } from '@/lib/request';

import useApp from './use-app';

interface IProps {
  disabled?: boolean;
}

const PRO_NAMESPACES_CACHE_TTL = 60000;
let proNamespacesCache: Array<Namespace> | undefined;
let proNamespacesCacheExpiresAt = 0;
let proNamespacesPromise: Promise<Array<Namespace>> | undefined;

function getProNamespaces(force?: boolean) {
  if (proNamespacesPromise) {
    return proNamespacesPromise;
  }

  if (
    !force &&
    proNamespacesCache &&
    proNamespacesCacheExpiresAt > Date.now()
  ) {
    return Promise.resolve(proNamespacesCache);
  }

  proNamespacesPromise = http
    .get<Array<Namespace>>('pro-namespaces')
    .then(namespaces => {
      proNamespacesCache = namespaces;
      proNamespacesCacheExpiresAt = Date.now() + PRO_NAMESPACES_CACHE_TTL;
      return namespaces;
    })
    .finally(() => {
      proNamespacesPromise = undefined;
    });

  return proNamespacesPromise;
}

export default function useProNamespaces(props?: IProps) {
  const { disabled = false } = props || {};
  const app = useApp();
  const [loading, onLoading] = useState(false);
  const [data, onData] = useState<Array<Namespace>>([]);

  const refetch = (force?: boolean) => {
    if (disabled) {
      return;
    }
    if (!localStorage.getItem('uid')) {
      return;
    }
    onLoading(true);
    return getProNamespaces(force)
      .then(onData)
      .finally(() => {
        onLoading(false);
      });
  };

  useEffect(() => {
    if (disabled) {
      return;
    }
    let mounted = true;
    const update = (force?: boolean) => {
      if (!localStorage.getItem('uid')) {
        return;
      }
      onLoading(true);
      getProNamespaces(force)
        .then(namespaces => {
          if (mounted) {
            onData(namespaces);
          }
        })
        .finally(() => {
          if (mounted) {
            onLoading(false);
          }
        });
    };

    update();
    const off = app.on('namespaces_refetch', () => update(true));

    return () => {
      mounted = false;
      off?.();
    };
  }, [disabled]);

  return { app, data, loading, refetch };
}
