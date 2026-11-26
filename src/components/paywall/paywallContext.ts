import { createContext, useContext } from 'react';

import type {
  PaywallDismissReason,
  PaywallRequest,
  PaywallScene,
  ShowPaywallOptions,
} from './paywallTypes';

export interface PaywallContextValue {
  request: PaywallRequest | null;
  showPaywall: (scene: PaywallScene, options?: ShowPaywallOptions) => boolean;
  hidePaywall: (reason?: PaywallDismissReason) => void;
}

export const PaywallContext = createContext<PaywallContextValue | null>(null);

const fallbackPaywall: PaywallContextValue = {
  request: null,
  showPaywall: () => false,
  hidePaywall: () => undefined,
};

export function usePaywall() {
  return useContext(PaywallContext) ?? fallbackPaywall;
}
