import axios from 'axios';
import { useEffect, useState } from 'react';

import type { APIKey, CreateAPIKeyDto, UpdateAPIKeyDto } from '@/interface';
import { http } from '@/lib/request';

export default function useAPIKeys(userId?: string, namespaceId?: string) {
  const [loading, setLoading] = useState(true);
  const [apiKeys, setAPIKeys] = useState<APIKey[]>([]);

  const fetchAPIKeys = () => {
    if (!userId && !namespaceId) return;

    const source = axios.CancelToken.source();
    const params = new URLSearchParams();
    if (userId) params.append('user_id', userId);
    if (namespaceId) params.append('namespace_id', namespaceId);

    setLoading(true);
    http
      .get(`/api-keys?${params.toString()}`, {
        cancelToken: source.token,
      })
      .then(setAPIKeys)
      .finally(() => {
        setLoading(false);
      });

    return () => {
      source.cancel();
    };
  };

  const createAPIKey = (data: CreateAPIKeyDto) => {
    return http.post('/api-keys', data).then((newKey: APIKey) => {
      setAPIKeys(prev => [...prev, newKey]);
      return newKey;
    });
  };

  const updateAPIKey = (id: string, data: UpdateAPIKeyDto) => {
    return http.put(`/api-keys/${id}`, data).then((updatedKey: APIKey) => {
      setAPIKeys(prev => prev.map(key => (key.id === id ? updatedKey : key)));
      return updatedKey;
    });
  };

  const deleteAPIKey = (id: string) => {
    return http.delete(`/api-keys/${id}`).then(() => {
      setAPIKeys(prev => prev.filter(key => key.id !== id));
    });
  };

  useEffect(() => {
    const cleanup = fetchAPIKeys();
    return cleanup;
  }, [userId, namespaceId]);

  return {
    apiKeys,
    loading,
    refetch: fetchAPIKeys,
    createAPIKey,
    updateAPIKey,
    deleteAPIKey,
  };
}
