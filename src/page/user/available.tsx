import React from 'react';

import { useAuthConfig } from '@/hooks/auth-config-context';

interface IProps {
  children: (access: {
    [index in 'wechat' | 'google' | 'apple']: boolean;
  }) => React.ReactNode;
}

export function Available(props: IProps) {
  const { children } = props;
  const { config } = useAuthConfig();

  return children(config);
}
