import { User } from '@/interface';
import { http } from '@/utils/request';
import { useState, useEffect } from 'react';

export default function useContext() {
  const [start, onStart] = useState(1);
  const [limit, onLimit] = useState(10);
  const [search, onSearch] = useState('');
  const [loading, onLoading] = useState(true);
  const [data, onData] = useState<{
    start: number;
    limit: number;
    list: Array<User>;
    total: number;
  }>({
    start: 1,
    limit: 10,
    list: [],
    total: 0,
  });
  const refetch = () => {
    http
      .get(`user?start=${start}&limit=${limit}&search=${search}`)
      .then(onData)
      .finally(() => {
        onLoading(false);
      });
  };

  useEffect(refetch, [search, start, limit]);

  return { data, search, onSearch, onStart, onLimit, loading };
}
