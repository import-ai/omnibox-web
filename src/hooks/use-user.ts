import axios from 'axios';
import { useEffect, useState } from 'react';

import { User } from '@/interface';
import { http } from '@/lib/request';

// Custom event name for user data updates
const USER_UPDATED_EVENT = 'user-data-updated';

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
        // Dispatch custom event to notify other useUser instances
        window.dispatchEvent(
          new CustomEvent(USER_UPDATED_EVENT, { detail: data })
        );
        callback && callback();
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(refetch, []);

  // Listen for user updates from other instances
  useEffect(() => {
    const handleUserUpdate = (event: CustomEvent) => {
      setUser(prev => ({ ...prev, ...event.detail }));
    };

    window.addEventListener(
      USER_UPDATED_EVENT,
      handleUserUpdate as EventListener
    );
    return () => {
      window.removeEventListener(
        USER_UPDATED_EVENT,
        handleUserUpdate as EventListener
      );
    };
  }, []);

  return { uid, user, loading, onChange, refetch };
}
