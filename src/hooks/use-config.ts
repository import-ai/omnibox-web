import { useEffect, useState } from 'react';

import { http } from '@/lib/request';

export interface IPropsConfig {
  commercial: boolean;
}

export default function useConfig() {
  const [config, setConfig] = useState<IPropsConfig>({ commercial: false });

  useEffect(() => {
    http.get('/config').then(setConfig);
  }, []);

  return { config };
}
