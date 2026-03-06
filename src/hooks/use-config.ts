import { useEffect, useState } from 'react';

import { http } from '@/lib/request';

export interface IPropsConfig {
  commercial: boolean;
}

export default function useConfig() {
  const [config, setConfig] = useState<IPropsConfig>({ commercial: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    http.get('/config').then(data => {
      setConfig(data);
      setLoading(false);
    });
  }, []);

  return { config, loading };
}
