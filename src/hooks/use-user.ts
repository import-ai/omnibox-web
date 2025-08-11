import axios from 'axios';
import { useEffect, useState } from 'react';

import { User } from '@/interface';
import { http } from '@/lib/request';

export default function useUser() {
  const uid = localStorage.getItem('uid');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User>({
    id: '',
    email: '',
    username: '',
  });
  const refetch = () => {
    const source = axios.CancelToken.source();
    http
      .get(`user/${uid}`, { cancelToken: source.token })
      .then(setUser)
      .finally(() => {
        setLoading(false);
      });
    return () => {
      source.cancel();
    };
  };
  const onChange = (data: any, callback?: () => void) => {
    return http
      .patch(`user/${uid}`, data)
      .then(() => {
        setUser({ ...user, ...data });
        callback && callback();
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(refetch, []);

  return { uid, user, loading, onChange };
}
