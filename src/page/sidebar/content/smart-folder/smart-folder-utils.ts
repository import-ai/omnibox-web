import type {
  CreateSmartFolderPayload,
  CreateSmartFolderRequest,
  SmartFolderApiCondition,
  SmartFolderApiOperator,
  SmartFolderCondition,
  SmartFolderField,
  SmartFolderFieldType,
  SmartFolderNamespaceTier,
  SmartFolderOperator,
  SmartFolderRelativeDateUnit,
  SmartFolderValue,
} from './index';

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

const OPERATOR_TO_API_MAP: Partial<
  Record<SmartFolderOperator, SmartFolderApiOperator>
> = {
  in_last: 'recent',
  not_in_last: 'earlier_than',
  before_date: 'before',
  after_date: 'after',
  between_dates: 'between',
};

const OPERATOR_FROM_API_MAP: Partial<
  Record<SmartFolderApiOperator, SmartFolderOperator>
> = {
  recent: 'in_last',
  earlier_than: 'not_in_last',
  before: 'before_date',
  after: 'after_date',
  between: 'between_dates',
};

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

function normalizeDateRangeValue(value: SmartFolderValue) {
  if (value.kind !== 'date_range') {
    return value;
  }

  if (!value.startDate || !value.endDate) {
    return value;
  }

  if (value.startDate <= value.endDate) {
    return value;
  }

  return {
    ...value,
    startDate: value.endDate,
    endDate: value.startDate,
  };
}

export function normalizeConditionValue(
  field?: SmartFolderCondition['field'],
  operator?: SmartFolderCondition['operator'],
  value?: SmartFolderCondition['value']
): SmartFolderValue | undefined {
  if (!field || !operator) {
    return undefined;
  }

  if (!shouldShowValueInput(operator)) {
    return undefined;
  }

  const fieldType = getFieldType(field);
  if (fieldType === 'text') {
    if (typeof value === 'string') {
      return { kind: 'text', text: value.trim() };
    }

    if (value?.kind === 'text') {
      return { kind: 'text', text: value.text.trim() };
    }

    return createDefaultValue(operator);
  }

  if (RELATIVE_DATE_OPERATORS.has(operator)) {
    if (typeof value !== 'string' && value?.kind === 'relative_date') {
      return {
        kind: 'relative_date',
        amount: value.amount,
        unit: value.unit,
      };
    }

    return createDefaultValue(operator);
  }

  if (SINGLE_DATE_OPERATORS.has(operator)) {
    if (typeof value !== 'string' && value?.kind === 'single_date') {
      return {
        kind: 'single_date',
        date: value.date || getTodayDateString(),
      };
    }

    return createDefaultValue(operator);
  }

  if (operator === 'between_dates') {
    if (typeof value !== 'string' && value?.kind === 'date_range') {
      return normalizeDateRangeValue(value);
    }

    return createDefaultValue(operator);
  }

  return createDefaultValue(operator);
}

export function normalizeRelativeDateAmount(value?: string | number) {
  const text = String(value ?? '').trim();

  if (!/^\d*$/.test(text)) {
    return '';
  }

  return text.replace(/^0+(?=\d)/, '');
}

export function isConditionComplete(condition: SmartFolderCondition) {
  if (!condition.field || !condition.operator) {
    return false;
  }

  if (!shouldShowValueInput(condition.operator)) {
    return true;
  }

  const value = normalizeConditionValue(
    condition.field,
    condition.operator,
    condition.value
  );

  if (!value) {
    return false;
  }

  if (value.kind === 'text') {
    return !!value.text.trim();
  }

  if (value.kind === 'relative_date') {
    return /^[1-9]\d*$/.test(normalizeRelativeDateAmount(value.amount));
  }

  if (value.kind === 'single_date') {
    return !!value.date;
  }

  return !!value.startDate && !!value.endDate;
}

function toApiOperator(
  operator?: SmartFolderOperator
): SmartFolderApiOperator | undefined {
  if (!operator) {
    return undefined;
  }

  return OPERATOR_TO_API_MAP[operator] || operator;
}

function fromApiOperator(
  operator?: SmartFolderApiOperator
): SmartFolderOperator | undefined {
  if (!operator) {
    return undefined;
  }

  return OPERATOR_FROM_API_MAP[operator] || (operator as SmartFolderOperator);
}

export function normalizeCondition(
  condition: SmartFolderCondition
): SmartFolderCondition | null {
  if (!condition.field) {
    return null;
  }

  const operator = condition.operator || getDefaultOperator(condition.field);
  const nextValue = normalizeConditionValue(
    condition.field,
    operator,
    condition.value
  );

  return {
    field: condition.field,
    operator,
    ...(nextValue ? { value: nextValue } : {}),
  };
}

export function fromSmartFolderApiCondition(
  condition: SmartFolderApiCondition | SmartFolderCondition
): SmartFolderCondition {
  const operator = fromApiOperator(condition.operator);

  if (!condition.field || !operator) {
    return {};
  }

  if (typeof condition.value === 'string') {
    return {
      field: condition.field,
      operator,
      value: { kind: 'text', text: condition.value },
    };
  }

  if (condition.value && typeof condition.value === 'object') {
    if ('amount' in condition.value) {
      return {
        field: condition.field,
        operator,
        value: {
          kind: 'relative_date',
          amount: String(condition.value.amount || ''),
          unit: condition.value.unit || DEFAULT_RELATIVE_DATE_UNIT,
        },
      };
    }

    if ('date' in condition.value) {
      return {
        field: condition.field,
        operator,
        value: {
          kind: 'single_date',
          date: condition.value.date || getTodayDateString(),
        },
      };
    }

    if (
      'startDate' in condition.value ||
      'endDate' in condition.value ||
      'start_date' in condition.value ||
      'end_date' in condition.value
    ) {
      const value = condition.value as {
        startDate?: string;
        endDate?: string;
        start_date?: string;
        end_date?: string;
      };
      return {
        field: condition.field,
        operator,
        value: {
          kind: 'date_range',
          startDate:
            value.startDate || value.start_date || getTodayDateString(),
          endDate: value.endDate || value.end_date || getTodayDateString(),
        },
      };
    }
  }

  return {
    field: condition.field,
    operator,
    ...(shouldShowValueInput(operator)
      ? { value: createDefaultValue(operator) }
      : {}),
  };
}

function toSmartFolderApiCondition(
  condition: SmartFolderCondition
): SmartFolderApiCondition {
  const operator = toApiOperator(condition.operator);
  const value = condition.value;

  if (!operator) {
    return condition;
  }

  if (typeof value === 'string' || value === undefined) {
    return {
      ...condition,
      operator,
      ...(value !== undefined ? { value } : {}),
    };
  }

  if (value.kind === 'text') {
    return {
      ...condition,
      operator,
      value: value.text.trim(),
    };
  }

  if (value.kind === 'relative_date') {
    return {
      ...condition,
      operator,
      value: {
        amount: Number(normalizeRelativeDateAmount(value.amount)),
        unit: value.unit,
      },
    };
  }

  if (value.kind === 'single_date') {
    return {
      ...condition,
      operator,
      value: { date: value.date },
    };
  }

  return {
    ...condition,
    operator,
    value: {
      start_date: value.startDate,
      end_date: value.endDate,
    },
  };
}

export function toSmartFolderApiPayload(
  payload: CreateSmartFolderPayload
): CreateSmartFolderRequest {
  const normalizedConditions = payload.conditions
    .map(condition => normalizeCondition(condition))
    .filter((condition): condition is SmartFolderCondition => !!condition);

  return {
    name: payload.name.trim(),
    owner_scope: payload.ownerScope,
    root_scope: payload.rootScope,
    match_mode: payload.matchMode,
    conditions: normalizedConditions.map(toSmartFolderApiCondition),
  };
}
