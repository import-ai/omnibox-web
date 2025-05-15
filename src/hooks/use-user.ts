import { User } from '@/interface';
import { http } from '@/lib/request';
import { useState, useEffect } from 'react';

export default function useUser() {
  const uid = localStorage.getItem('uid');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User>({
    id: '',
    email: '',
    username: '--',
  });
  const refetch = () => {
    http
      .get(`user/${uid}`)
      .then(setUser)
      .finally(() => {
        setLoading(false);
      });
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
