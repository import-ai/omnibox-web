import { http } from '@/lib/request';
import { Member } from '@/interface';
import { useState, useEffect } from 'react';

interface IProps {
  namespaceId: string;
}

export default function useNamespaceMember(props: IProps) {
  const { namespaceId } = props;
  const [loading, onLoading] = useState(false);
  const [data, onData] = useState<Array<Member>>([]);
  const refetch = () => {
    onLoading(true);
    http
      .get(`namespaces/${namespaceId}/members`)
      .then(onData)
      .finally(() => {
        onLoading(false);
      });
  };

  useEffect(refetch, []);

  return {
    data,
    refetch,
    loading,
  };
}
