export type ResourceConditionMatchMode = 'all' | 'any';

export type ResourceConditionField =
  | 'title'
  | 'tags'
  | 'url'
  | 'file_name'
  | 'content'
  | 'created_at'
  | 'updated_at';

export type ResourceConditionFieldType = 'text' | 'date';

export type ResourceConditionOperator =
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

export type ResourceConditionRelativeDateUnit =
  | 'day'
  | 'week'
  | 'month'
  | 'year';

export type ResourceConditionNamespaceTier = 'basic' | 'premium' | undefined;

export type ResourceConditionApiOperator =
  | ResourceConditionOperator
  | 'recent'
  | 'earlier_than'
  | 'before'
  | 'after'
  | 'on'
  | 'not_on'
  | 'between';

export interface ResourceConditionTextValue {
  kind: 'text';
  text: string;
}

export interface ResourceConditionRelativeDateValue {
  kind: 'relative_date';
  amount: string;
  unit: ResourceConditionRelativeDateUnit;
}

export interface ResourceConditionSingleDateValue {
  kind: 'single_date';
  date: string;
}

export interface ResourceConditionDateRangeValue {
  kind: 'date_range';
  startDate: string;
  endDate: string;
}

export type ResourceConditionValue =
  | ResourceConditionTextValue
  | ResourceConditionRelativeDateValue
  | ResourceConditionSingleDateValue
  | ResourceConditionDateRangeValue;

export type ResourceConditionApiValue =
  | ResourceConditionValue
  | string
  | number
  | {
      amount?: number | string;
      unit?: ResourceConditionRelativeDateUnit;
      date?: string;
      startDate?: string;
      endDate?: string;
      start_date?: string;
      end_date?: string;
    };

export interface ResourceCondition {
  field?: ResourceConditionField;
  operator?: ResourceConditionOperator;
  value?: ResourceConditionValue | string;
}

export interface ResourceConditionApiCondition {
  field?: ResourceConditionField;
  operator?: ResourceConditionApiOperator;
  value?: ResourceConditionApiValue;
}

export interface ResourceConditionPayload {
  matchMode: ResourceConditionMatchMode;
  conditions: ResourceCondition[];
}

export interface ResourceConditionApiPayload {
  match_mode: ResourceConditionMatchMode;
  conditions: ResourceConditionApiCondition[];
}
