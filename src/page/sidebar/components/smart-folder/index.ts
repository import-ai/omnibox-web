import type { Namespace, Resource, ResourceMeta, SpaceType } from '@/interface';

export type SmartFolderMatchMode = 'all' | 'any';
export type SmartFolderOwnerScope = SpaceType;
export type SmartFolderRootScope = SpaceType | 'all';

export type SmartFolderField =
  | 'title'
  | 'tags'
  | 'url'
  | 'file_name'
  | 'content'
  | 'created_at';

export type SmartFolderFieldType = 'text' | 'date';

export type SmartFolderOperator =
  | 'contains'
  | 'not_contains'
  | 'equals'
  | 'not_equals'
  | 'is_empty'
  | 'is_not_empty'
  | 'in_last'
  | 'not_in_last'
  | 'before_date'
  | 'after_date'
  | 'between_dates';

export type SmartFolderRelativeDateUnit = 'day' | 'week' | 'month' | 'year';

export type SmartFolderNamespaceTier = 'basic' | 'premium' | undefined;

export type SmartFolderApiOperator =
  | SmartFolderOperator
  | 'recent'
  | 'earlier_than'
  | 'before'
  | 'after'
  | 'on'
  | 'not_on'
  | 'between';

export interface SmartFolderTextValue {
  kind: 'text';
  text: string;
}

export interface SmartFolderRelativeDateValue {
  kind: 'relative_date';
  amount: string;
  unit: SmartFolderRelativeDateUnit;
}

export interface SmartFolderSingleDateValue {
  kind: 'single_date';
  date: string;
}

export interface SmartFolderDateRangeValue {
  kind: 'date_range';
  startDate: string;
  endDate: string;
}

export type SmartFolderValue =
  | SmartFolderTextValue
  | SmartFolderRelativeDateValue
  | SmartFolderSingleDateValue
  | SmartFolderDateRangeValue;

export type SmartFolderApiValue =
  | SmartFolderValue
  | string
  | number
  | {
      amount?: number | string;
      unit?: SmartFolderRelativeDateUnit;
      date?: string;
      startDate?: string;
      endDate?: string;
      start_date?: string;
      end_date?: string;
    };

export interface SmartFolderCondition {
  field?: SmartFolderField;
  operator?: SmartFolderOperator;
  value?: SmartFolderValue | string;
}

export interface CreateSmartFolderPayload {
  name: string;
  ownerScope: SmartFolderOwnerScope;
  rootScope: SmartFolderRootScope;
  matchMode: SmartFolderMatchMode;
  conditions: SmartFolderCondition[];
}

export interface SmartFolderApiCondition {
  field?: SmartFolderField;
  operator?: SmartFolderApiOperator;
  value?: SmartFolderApiValue;
}

export interface CreateSmartFolderRequest {
  name: string;
  owner_scope: SmartFolderOwnerScope;
  root_scope: SmartFolderRootScope;
  match_mode: SmartFolderMatchMode;
  conditions: SmartFolderApiCondition[];
  parent_id?: string;
}

export interface SmartFolderResponse {
  resource: Resource;
  owner_scope: SmartFolderOwnerScope;
  root_scope: SmartFolderRootScope;
  match_mode: SmartFolderMatchMode;
  conditions: SmartFolderCondition[];
}

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

export type SmartFolderTier = 'basic' | 'premium';

export interface SmartFolderEntitlements {
  tier: SmartFolderTier;
  privateLimit: number;
  teamLimit: number;
  privateUsed: number;
  teamUsed: number;
  ruleLimit: number;
  trashRetentionDays: number;
}

type SmartFolderResourceRef = Pick<Resource, 'attrs' | 'id' | 'parent_id'>;

type SmartFolderSidebarAttrs = {
  smart_folder_child?: boolean;
  source_resource_id?: string;
  source_parent_id?: string;
};

type SmartFolderChildResource = SmartFolderResourceRef & {
  attrs?: Record<string, unknown>;
};

export function getSmartFolderSidebarAttrs(
  resource?: Pick<Resource, 'attrs'> | null
): SmartFolderSidebarAttrs | undefined {
  const sidebarAttrs = resource?.attrs?.sidebar;

  return sidebarAttrs && typeof sidebarAttrs === 'object'
    ? (sidebarAttrs as SmartFolderSidebarAttrs)
    : undefined;
}

export function isSmartFolderChildResource(
  resource?: Pick<Resource, 'attrs'> | null
) {
  return getSmartFolderSidebarAttrs(resource)?.smart_folder_child === true;
}

export function withSmartFolderChildSidebarAttrs(
  resource: SmartFolderChildResource,
  parentId: string
) {
  return {
    ...resource,
    id: getSmartFolderChildSidebarKey(parentId, resource.id),
    parent_id: parentId,
    has_children: false,
    attrs: {
      ...(resource.attrs || {}),
      sidebar: {
        ...(getSmartFolderSidebarAttrs(resource) || {}),
        smart_folder_child: true,
        source_resource_id: resource.id,
        source_parent_id: resource.parent_id,
      },
    },
  };
}

export function getSmartFolderSourceResourceId(
  resource: SmartFolderResourceRef
) {
  return isSmartFolderChildResource(resource)
    ? getSmartFolderSidebarAttrs(resource)?.source_resource_id || resource.id
    : resource.id;
}

export function getSmartFolderSourceParentId(resource: SmartFolderResourceRef) {
  return isSmartFolderChildResource(resource)
    ? getSmartFolderSidebarAttrs(resource)?.source_parent_id
    : resource.parent_id;
}

export function getSmartFolderChildSidebarKey(
  parentId: string,
  sourceResourceId: string
) {
  return `smart-folder-child-${parentId}-${sourceResourceId}`;
}

/**
 * Given a composite sidebar key and the known source resource id, returns the
 * smart folder parent id encoded in the key, or null if the key is not a
 * smart-folder-child key for that resource.
 */
export function getSmartFolderParentIdFromChildKey(
  key: string,
  sourceResourceId: string
): string | null {
  const prefix = 'smart-folder-child-';
  const suffix = `-${sourceResourceId}`;
  if (!key.startsWith(prefix) || !key.endsWith(suffix)) return null;
  const parentId = key.slice(prefix.length, key.length - suffix.length);
  return parentId || null;
}
