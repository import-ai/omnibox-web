import axios from 'axios';
import { useEffect, useState } from 'react';

import { Member } from '@/interface';
import { http } from '@/lib/request';

interface IProps {
  namespaceId: string;
}

export default function useNamespaceMember(props: IProps) {
  const { namespaceId } = props;
  const [loading, onLoading] = useState(false);
  const [data, onData] = useState<Array<Member>>([]);
  const refetch = () => {
    onLoading(true);
    const source = axios.CancelToken.source();
    http
      .get(`namespaces/${namespaceId}/members`, { cancelToken: source.token })
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
