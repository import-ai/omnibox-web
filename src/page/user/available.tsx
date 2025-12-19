import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { http } from '@/lib/request';

interface IProps {
  children: (access: {
    [index in 'wechat' | 'google' | 'apple']: boolean;
  }) => React.ReactNode;
}

export function Available(props: IProps) {
  const { children } = props;
  const [data, onData] = useState({
    wechat: false,
    google: false,
    apple: false,
  });

  useEffect(() => {
    Promise.all(
      ['wechat', 'google', 'apple'].map(item => http.get(`/${item}/available`))
    )
      .then(response => {
        onData({
          wechat: response[0].available,
          google: response[1].available,
          apple: response[2].available,
        });
      })
      .catch(error => {
        toast.error(error.message, { position: 'bottom-right' });
      });
  }, []);

  return children(data);
}
