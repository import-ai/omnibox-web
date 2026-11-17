import type { NamespaceTier } from '@/interface';

/** A paywall trigger. Every scene maps to one Figma copy block. */
export type PaywallScene =
  | 'storage_limit'
  | 'credits_limit'
  | 'namespace_create'
  | 'search_filter_limit'
  | 'smart_filter_limit'
  | 'rss_link_limit'
  | 'smart_folder_limit'
  | 'rss_folder_limit'
  | 'namespace_expired';

export type PaywallDismissReason =
  'close' | 'dismiss' | 'acknowledge' | 'navigate';

export interface ShowPaywallOptions {
  namespaceId?: string;
  tier?: NamespaceTier;
  /** Resolved by the caller when the namespace is account-level or already loaded. */
  isOwner?: boolean;
  /** Where the trigger happened, for analytics. */
  trigger?: string;
}

export interface PaywallRequest extends ShowPaywallOptions {
  id: number;
  scene: PaywallScene;
}

export interface PaywallSceneDefinition {
  priority: number;
  entry: string;
  tiered: boolean;
}
