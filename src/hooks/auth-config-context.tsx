import React, { createContext, useContext, useEffect, useState } from 'react';

import { http } from '@/lib/request';

interface AuthConfig {
  wechat: boolean;
  google: boolean;
  apple: boolean;
}

interface AuthConfigContextValue {
  config: AuthConfig;
  loading: boolean;
}

const STORAGE_KEY = 'auth_config_cache';

const getCachedConfig = (): AuthConfig | null => {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {
    // ignore parse error
  }
  return null;
};

const setCachedConfig = (config: AuthConfig) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore storage error
  }
};

const defaultConfig: AuthConfig = {
  wechat: false,
  google: false,
  apple: false,
};

const AuthConfigContext = createContext<AuthConfigContextValue>({
  config: defaultConfig,
  loading: true,
});

export function AuthConfigProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // use cached config as initial value to prevent flickering
  const cachedConfig = getCachedConfig();
  const [config, setConfig] = useState<AuthConfig>(
    cachedConfig ?? defaultConfig
  );
  const [loading, setLoading] = useState(cachedConfig === null);

  useEffect(() => {
    Promise.all(
      ['wechat', 'google', 'apple'].map(item => http.get(`/${item}/available`))
    )
      .then(response => {
        const newConfig = {
          wechat: response[0].available,
          google: response[1].available,
          apple: response[2].available,
        };
        setConfig(newConfig);
        setCachedConfig(newConfig);
      })
      .catch(() => {
        // keep current config (may be from cache)
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <AuthConfigContext.Provider value={{ config, loading }}>
      {children}
    </AuthConfigContext.Provider>
  );
}

export function useAuthConfig() {
  return useContext(AuthConfigContext);
}
