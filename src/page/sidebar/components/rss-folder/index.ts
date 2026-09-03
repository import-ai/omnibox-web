import type { Namespace, Resource, ResourceMeta } from '@/interface';

export interface RssLinkRow {
  url: string;
  name: string;
  error?: string;
}

export interface RssFolderLink {
  url: string;
  name?: string;
}

export interface CreateRssFolderPayload {
  name: string;
  links: RssFolderLink[];
}

export interface RssFolderConfigLink {
  id: string;
  index: number;
  url: string;
  name: string;
}

export interface RssFolderResponse {
  resource: Resource;
  links: RssFolderConfigLink[];
  initial_sync_status?: RssFolderInitialSyncStatus;
}

export type RssFolderInitialSyncStatus =
  'pending' | 'polling' | 'succeeded' | 'failed';

export interface CreateRssFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: CreateRssFolderPayload) => Promise<void>;
  currentResourceId?: string;
  initialValue?: CreateRssFolderPayload | null;
  siblingResources?: ResourceMeta[];
  title?: string;
  confirmText?: string;
  currentNamespace?: Namespace;
}

export type RssFolderTier = 'basic' | 'premium';

export interface RssFolderLimits {
  tier: RssFolderTier;
  linkLimit: number;
  folderPrivateLimit: number;
  folderTeamLimit: number;
  folderPrivateUsed: number;
  folderTeamUsed: number;
}
