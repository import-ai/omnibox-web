import { User } from '@/interface';
import { http } from '@/utils/request';
import { useState, useEffect } from 'react';

export default function useUser() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const refetch = () => {
    const uid = localStorage.getItem('uid');
    http
      .get(`user/${uid}`)
      .then(setUser)
      .finally(() => {
        setLoading(false);
      });
  };
  const onChange = (data: Partial<User>, callback?: () => void) => {
    const uid = localStorage.getItem('uid');
    http
      .patch(`user/${uid}`, data)
      .then((res) => {
        setUser(res);
        callback && callback();
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(refetch, []);

  console.log(user);

  return { user, loading, onChange };
}
