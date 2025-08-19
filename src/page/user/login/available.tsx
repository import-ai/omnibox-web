import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { http } from '@/lib/request';

interface IProps {
  children: (access: {
    [index in 'wechat' | 'google']: boolean;
  }) => React.ReactNode;
}

export function Available(props: IProps) {
  const { children } = props;
  const [data, onData] = useState({
    wechat: false,
    google: false,
  });

  useEffect(() => {
    Promise.all(
      ['wechat', 'google'].map(item => http.get(`/${item}/available`))
    )
      .then(response => {
        onData({
          wechat: response[0].available,
          google: response[1].available,
        });
      })
      .catch(error => {
        toast.error(error.message, { position: 'bottom-right' });
      });
  }, []);

  return children(data);
}
