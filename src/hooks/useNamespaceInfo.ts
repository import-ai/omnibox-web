import { useEffect, useState } from 'react';

import type { Namespace } from '@/interface';
import { http } from '@/lib/request';

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { data: Namespace; at: number }>();
const pending = new Map<string, Promise<Namespace>>();

export function fetchNamespaceInfo(namespaceId: string): Promise<Namespace> {
  const cached = cache.get(namespaceId);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return Promise.resolve(cached.data);
  }

  const inFlight = pending.get(namespaceId);
  if (inFlight) return inFlight;

  const request = http
    .get<Namespace>(`namespaces/${namespaceId}`)
    .then(data => {
      cache.set(namespaceId, { data, at: Date.now() });
      return data;
    })
    .finally(() => {
      pending.delete(namespaceId);
    });
  pending.set(namespaceId, request);
  return request;
}

export function useNamespaceInfo(namespaceId?: string) {
  const [namespace, setNamespace] = useState<Namespace | undefined>(() =>
    namespaceId ? cache.get(namespaceId)?.data : undefined
  );
  const [loading, setLoading] = useState(false);
  const [resolvedId, setResolvedId] = useState<string | undefined>(() =>
    namespaceId && cache.has(namespaceId) ? namespaceId : undefined
  );

  useEffect(() => {
    if (!namespaceId) {
      setNamespace(undefined);
      setLoading(false);
      setResolvedId(undefined);
      return;
    }

    const cached = cache.get(namespaceId);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      setNamespace(cached.data);
      setLoading(false);
      setResolvedId(namespaceId);
      return;
    }

    let active = true;
    setNamespace(undefined);
    setLoading(true);
    fetchNamespaceInfo(namespaceId)
      .then(data => {
        if (active) setNamespace(data);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) {
          setLoading(false);
          setResolvedId(namespaceId);
        }
      });

    return () => {
      active = false;
    };
  }, [namespaceId]);

  return { namespace, loading, resolvedId };
}
