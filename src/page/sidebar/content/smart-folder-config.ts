import {
  SmartFolderCondition,
  SmartFolderField,
  SmartFolderFieldType,
  SmartFolderOperator,
  SmartFolderRelativeDateUnit,
  SmartFolderValue,
} from './smart-folder-types';

interface SmartFolderFieldDefinition {
  type: SmartFolderFieldType;
  operators: SmartFolderOperator[];
}

const TEXT_OPERATORS: SmartFolderOperator[] = [
  'contains',
  'not_contains',
  'equals',
  'not_equals',
  'is_empty',
  'is_not_empty',
];

const DATE_OPERATORS: SmartFolderOperator[] = [
  'in_last',
  'not_in_last',
  'before_date',
  'after_date',
  'between_dates',
];

const FIELD_DEFINITIONS: Record<SmartFolderField, SmartFolderFieldDefinition> =
  {
    title: { type: 'text', operators: TEXT_OPERATORS },
    tags: { type: 'text', operators: TEXT_OPERATORS },
    url: { type: 'text', operators: TEXT_OPERATORS },
    file_name: { type: 'text', operators: TEXT_OPERATORS },
    created_at: { type: 'date', operators: DATE_OPERATORS },
    content: { type: 'text', operators: TEXT_OPERATORS },
  };

export const VALUE_LESS_OPERATORS = new Set<SmartFolderOperator>([
  'is_empty',
  'is_not_empty',
]);

export const RELATIVE_DATE_OPERATORS = new Set<SmartFolderOperator>([
  'in_last',
  'not_in_last',
]);

export const SINGLE_DATE_OPERATORS = new Set<SmartFolderOperator>([
  'before_date',
  'after_date',
]);

export const DEFAULT_RELATIVE_DATE_UNIT: SmartFolderRelativeDateUnit = 'day';
const BASIC_CONDITION_LIMIT = 3;
const PREMIUM_CONDITION_LIMIT = 10;
type SmartFolderNamespaceTier = 'basic' | 'premium' | undefined;

export const SMART_FOLDER_FIELD_OPTIONS = Object.keys(
  FIELD_DEFINITIONS
) as SmartFolderField[];

export const SMART_FOLDER_RELATIVE_DATE_UNITS: SmartFolderRelativeDateUnit[] = [
  'day',
  'week',
  'month',
  'quarter',
  'year',
];

export function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function getFieldType(field?: SmartFolderField): SmartFolderFieldType {
  if (!field) {
    return 'text';
  }

  return FIELD_DEFINITIONS[field].type;
}

export function getAvailableOperators(
  field?: SmartFolderField
): SmartFolderOperator[] {
  if (!field) {
    return [];
  }

  return FIELD_DEFINITIONS[field].operators;
}

export function getDefaultOperator(field?: SmartFolderField) {
  const operators = getAvailableOperators(field);

  return operators[0];
}

export function getConditionLimitValue(tier?: SmartFolderNamespaceTier) {
  return tier === 'premium' ? PREMIUM_CONDITION_LIMIT : BASIC_CONDITION_LIMIT;
}

export function getConditionLimitMessage(tier?: SmartFolderNamespaceTier) {
  return tier === 'premium'
    ? 'smart_folder.create.limit_reached_premium'
    : 'smart_folder.create.limit_reached_basic';
}

export function shouldShowValueInput(operator?: SmartFolderOperator) {
  return !!operator && !VALUE_LESS_OPERATORS.has(operator);
}

export function createDefaultValue(
  operator?: SmartFolderOperator
): SmartFolderValue | undefined {
  if (!operator || VALUE_LESS_OPERATORS.has(operator)) {
    return undefined;
  }

  if (RELATIVE_DATE_OPERATORS.has(operator)) {
    return {
      kind: 'relative_date',
      amount: '1',
      unit: DEFAULT_RELATIVE_DATE_UNIT,
    };
  }

  if (SINGLE_DATE_OPERATORS.has(operator)) {
    return {
      kind: 'single_date',
      date: getTodayDateString(),
    };
  }

  if (operator === 'between_dates') {
    const today = getTodayDateString();

    return {
      kind: 'date_range',
      startDate: today,
      endDate: today,
    };
  }

  return {
    kind: 'text',
    text: '',
  };
}

export function getInitialConditionForField(
  field: SmartFolderField
): SmartFolderCondition {
  const operator = getDefaultOperator(field);

  return {
    field,
    operator,
    value: createDefaultValue(operator),
  };
}

export function createDefaultCondition(): SmartFolderCondition {
  return getInitialConditionForField('title');
}
