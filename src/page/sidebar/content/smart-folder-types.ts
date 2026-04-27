import { SpaceType } from '@/interface';

export type SmartFolderMatchMode = 'all' | 'any';

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

export type SmartFolderRelativeDateUnit =
  | 'day'
  | 'week'
  | 'month'
  | 'quarter'
  | 'year';

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

export interface SmartFolderCondition {
  field?: SmartFolderField;
  operator?: SmartFolderOperator;
  value?: SmartFolderValue | string;
}

export interface CreateSmartFolderPayload {
  name: string;
  matchMode: SmartFolderMatchMode;
  conditions: SmartFolderCondition[];
}

export interface CreateSmartFolderRequest extends CreateSmartFolderPayload {
  parentId: string;
  rootScope: SpaceType;
}

export interface SmartFolderResponse {
  resource: import('@/interface').Resource;
  root_scope?: SpaceType;
  rootScope?: SpaceType;
  match_mode?: SmartFolderMatchMode;
  matchMode?: SmartFolderMatchMode;
  conditions: SmartFolderCondition[];
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
