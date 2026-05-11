import { Namespace, ResourceMeta } from '@/interface';

import {
  CreateSmartFolderPayload,
  CreateSmartFolderRequest,
  SmartFolderOwnerScope,
} from './smart-folder-types';

export interface CreateSmartFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: CreateSmartFolderRequest) => Promise<void>;
  currentResourceId?: string;
  initialValue?: CreateSmartFolderPayload | null;
  hasTeamspace?: boolean;
  privateSmartFolderCount?: number;
  teamSmartFolderCount?: number;
  siblingResources?: ResourceMeta[];
  siblingResourcesByScope?: Partial<
    Record<SmartFolderOwnerScope, ResourceMeta[]>
  >;
  title?: string;
  confirmText?: string;
  currentNamespace?: Namespace;
}
