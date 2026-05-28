import { useEffect, useState } from 'react';

import { ALLOWED_PHONE_COUNTRIES } from '@/const';
import { http } from '@/lib/request';

interface PhoneConfig {
  allowedCountries: readonly string[];
  smsAvailable: boolean;
  loading: boolean;
}

// Cache the phone config to avoid multiple API calls
let cachedConfig: { allowedCountries: string[]; smsAvailable: boolean } | null =
  null;

/**
 * Hook to fetch phone configuration from the backend API.
 * Falls back to ALLOWED_PHONE_COUNTRIES constant if the API call fails.
 */
export function usePhoneConfig(): PhoneConfig {
  const [config, setConfig] = useState<PhoneConfig>({
    allowedCountries: cachedConfig?.allowedCountries ?? ALLOWED_PHONE_COUNTRIES,
    smsAvailable: cachedConfig?.smsAvailable ?? true,
    loading: !cachedConfig,
  });

  useEffect(() => {
    // Skip if already cached
    if (cachedConfig) {
      return;
    }

    http
      .get<{ allowed_countries: string[]; sms_available: boolean }>(
        '/phone/config'
      )
      .then(response => {
        cachedConfig = {
          allowedCountries: response.allowed_countries,
          smsAvailable: response.sms_available,
        };
        setConfig({
          allowedCountries: response.allowed_countries,
          smsAvailable: response.sms_available,
          loading: false,
        });
      })
      .catch(() => {
        // Fallback to constant if API call fails
        setConfig({
          allowedCountries: ALLOWED_PHONE_COUNTRIES,
          smsAvailable: true,
          loading: false,
        });
      });
  }, []);

  return config;
}

/**
 * Clear the cached phone config (useful for testing or when config changes)
 */
export function clearPhoneConfigCache() {
  cachedConfig = null;
}
