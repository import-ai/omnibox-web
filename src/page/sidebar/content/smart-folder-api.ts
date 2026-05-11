import {
  createDefaultValue,
  DEFAULT_RELATIVE_DATE_UNIT,
  getDefaultOperator,
  getTodayDateString,
  shouldShowValueInput,
} from './smart-folder-config';
import type {
  CreateSmartFolderPayload,
  CreateSmartFolderRequest,
  SmartFolderCondition,
  SmartFolderField,
  SmartFolderOperator,
  SmartFolderRelativeDateUnit,
  SmartFolderValue,
} from './smart-folder-types';
import {
  normalizeConditionValue,
  normalizeRelativeDateAmount,
} from './smart-folder-validation';

type SmartFolderApiOperator =
  | SmartFolderOperator
  | 'recent'
  | 'earlier_than'
  | 'before'
  | 'after'
  | 'on'
  | 'not_on'
  | 'between';

type SmartFolderApiValue =
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

type SmartFolderApiCondition = {
  field?: SmartFolderField;
  operator?: SmartFolderApiOperator;
  value?: SmartFolderApiValue;
};

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
