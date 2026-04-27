import axios from 'axios';
import { useEffect, useState } from 'react';

import { Namespace } from '@/interface';
import { http } from '@/lib/request';

import useApp from './use-app';

interface IProps {
  disabled?: boolean;
}

let cachedNamespaces: Array<Namespace> | null = null;
let pendingRequest: Promise<Array<Namespace>> | null = null;
let cachedUserId = '';

export default function useProNamespaces(props?: IProps) {
  const { disabled = false } = props || {};
  const app = useApp();
  const [loading, onLoading] = useState(false);
  const [data, onData] = useState<Array<Namespace>>([]);
  const currentUserId = localStorage.getItem('uid') || '';

  const refetch = (force: boolean = false) => {
    if (disabled) {
      return;
    }
    if (!currentUserId) {
      return;
    }
    if (cachedUserId !== currentUserId) {
      cachedUserId = currentUserId;
      cachedNamespaces = null;
      pendingRequest = null;
    }
    if (!force && cachedNamespaces) {
      onData(cachedNamespaces);
      return;
    }
    if (!force && pendingRequest) {
      pendingRequest.then(onData);
      return;
    }
    onLoading(true);
    const source = axios.CancelToken.source();
    pendingRequest = http
      .get('pro-namespaces', { cancelToken: source.token })
      .then(response => {
        cachedNamespaces = response;
        onData(response);
        return response;
      })
      .finally(() => {
        pendingRequest = null;
        onLoading(false);
      });
    return () => {
      source.cancel();
    };
  };

  useEffect(() => {
    if (disabled) {
      return;
    }
    refetch();
    return app.on('namespaces_refetch', () => refetch(true));
  }, [currentUserId, disabled]);

  return { app, data, loading };
}
