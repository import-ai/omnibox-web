import axios from 'axios';
import { http } from '@/lib/request';
import { Resource } from '@/interface';
import React, { useState, useEffect } from 'react';

interface IProps {
  resource: Resource | null;
  namespaceId: string;
  children: React.ReactNode;
}

export function ShareWrapper(props: IProps) {
  const { namespaceId, resource, children } = props;
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!resource || !resource.path || resource.path.length <= 0) {
      return;
    }
    const source = axios.CancelToken.source();
    http
      .get(`/namespaces/${namespaceId}/root?namespace_id=${namespaceId}`, {
        cancelToken: source.token,
      })
      .then(response => {
        if (Array.isArray(resource.path) && resource.path.length > 0) {
          // @ts-ignore
          setOpen(resource.path[0].id !== response.private.id);
        }
      });
    return () => {
      source.cancel();
    };
  }, [namespaceId, resource]);

  if (!resource || !open) {
    return null;
  }

  return children;
}
