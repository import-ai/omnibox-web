import type { NamespaceTier } from '@/interface';

import type { PaywallScene, PaywallSceneDefinition } from './paywallTypes';

export const PAYWALL_SCENES: Record<PaywallScene, PaywallSceneDefinition> = {
  namespace_expired: {
    priority: 100,
    entry: 'paywall_namespace_expired',
    tiered: false,
  },
  storage_limit: {
    priority: 80,
    entry: 'paywall_storage_limit',
    tiered: true,
  },
  credits_limit: {
    priority: 70,
    entry: 'paywall_credits_limit',
    tiered: true,
  },
  namespace_create: {
    priority: 60,
    entry: 'paywall_namespace_create',
    tiered: false,
  },
  smart_folder_limit: {
    priority: 50,
    entry: 'paywall_smart_folder_limit',
    tiered: false,
  },
  rss_folder_limit: {
    priority: 50,
    entry: 'paywall_rss_folder_limit',
    tiered: false,
  },
  smart_filter_limit: {
    priority: 40,
    entry: 'paywall_smart_filter_limit',
    tiered: false,
  },
  search_filter_limit: {
    priority: 40,
    entry: 'paywall_search_filter_limit',
    tiered: false,
  },
  rss_link_limit: {
    priority: 30,
    entry: 'paywall_rss_link_limit',
    tiered: false,
  },
};

/** i18n key prefix for a scene, for example `paywall.storage_limit.basic`. */
export function paywallCopyKey(scene: PaywallScene, tier: NamespaceTier) {
  const definition = PAYWALL_SCENES[scene];
  return `paywall.${scene}${definition.tiered ? `.${tier}` : ''}`;
}

export function isPaywallScene(value: string): value is PaywallScene {
  return Object.prototype.hasOwnProperty.call(PAYWALL_SCENES, value);
}
