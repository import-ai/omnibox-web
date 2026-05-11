import {
  createDefaultValue,
  getFieldType,
  getTodayDateString,
  RELATIVE_DATE_OPERATORS,
  shouldShowValueInput,
  SINGLE_DATE_OPERATORS,
} from './smart-folder-config';
import { SmartFolderCondition, SmartFolderValue } from './smart-folder-types';

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
