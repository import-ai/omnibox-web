import axios from 'axios';
import { useEffect, useState } from 'react';

import { http } from '@/lib/request';

interface IProps {
  namespaceId: string;
}

export default function useNamespaceMember(props: IProps) {
  const { namespaceId } = props;
  const [loading, onLoading] = useState(false);
  const [data, onData] = useState<{ count: number }>({ count: 0 });
  const refetch = () => {
    onLoading(true);
    const source = axios.CancelToken.source();
    http
      .get(`namespaces/${namespaceId}/members/count`, {
        cancelToken: source.token,
      })
      .then(onData)
      .finally(() => {
        onLoading(false);
      });
    return () => {
      source.cancel();
    };
  };

  useEffect(refetch, []);

  return {
    data,
    refetch,
    loading,
  };
}
