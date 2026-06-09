import useSmartFolderEntitlements from '@/hooks/useSmartFolderEntitlements';
import { ResourceMeta } from '@/interface';
import {
  createDefaultCondition,
  fromResourceConditionApiCondition,
  normalizeResourceConditionValue,
} from '@/page/resource/conditions/resourceConditionUtils';

import {
  SmartFolderCondition,
  SmartFolderMatchMode,
  SmartFolderOwnerScope,
  SmartFolderRootScope,
} from './index';

export const MAX_SMART_FOLDER_NAME_LENGTH = 128;

export function hasSiblingNameConflict(
  siblings: ResourceMeta[] | undefined,
  name: string,
  currentResourceId?: string
) {
  return siblings?.some(resource => {
    if (resource.id === currentResourceId) {
      return false;
    }

    return resource.name?.trim() === name;
  });
}

export function normalizeInitialConditions(
  conditions?: SmartFolderCondition[]
): SmartFolderCondition[] {
  if (!conditions?.length) {
    return [createDefaultCondition()];
  }

  return conditions.map(condition => {
    const normalizedCondition = fromResourceConditionApiCondition(condition);

    if (!normalizedCondition?.field) {
      return {};
    }

    return {
      ...normalizedCondition,
      value: normalizeResourceConditionValue(
        normalizedCondition.field,
        normalizedCondition.operator,
        normalizedCondition.value
      ),
    };
  });
}

function serializeConditionValueForDirtyCheck(
  value?: SmartFolderCondition['value']
) {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (value.kind === 'text') {
    return {
      kind: value.kind,
      text: value.text,
    };
  }

  if (value.kind === 'relative_date') {
    return {
      kind: value.kind,
      amount: value.amount,
      unit: value.unit,
    };
  }

  if (value.kind === 'single_date') {
    return {
      kind: value.kind,
      date: value.date,
    };
  }

  return {
    kind: value.kind,
    startDate: value.startDate,
    endDate: value.endDate,
  };
}

function getSmartFolderQuotaUsed(
  entitlements: ReturnType<typeof useSmartFolderEntitlements>['data'],
  scope: SmartFolderOwnerScope,
  actualCount?: number
) {
  if (typeof actualCount === 'number') {
    return actualCount;
  }

  return scope === 'private'
    ? (entitlements?.privateUsed ?? 0)
    : (entitlements?.teamUsed ?? 0);
}

function getSmartFolderQuotaLimit(
  entitlements: ReturnType<typeof useSmartFolderEntitlements>['data'],
  scope: SmartFolderOwnerScope
) {
  if (!entitlements) {
    return -1;
  }

  return scope === 'private'
    ? (entitlements?.privateLimit ?? 1)
    : (entitlements?.teamLimit ?? 1);
}

export function isSmartFolderQuotaExhausted(
  entitlements: ReturnType<typeof useSmartFolderEntitlements>['data'],
  scope: SmartFolderOwnerScope,
  actualCount?: number
) {
  if (!entitlements) {
    return false;
  }

  const limit = getSmartFolderQuotaLimit(entitlements, scope);
  return (
    limit >= 0 &&
    getSmartFolderQuotaUsed(entitlements, scope, actualCount) >= limit
  );
}

export function getDefaultOwnerScope(
  entitlements: ReturnType<typeof useSmartFolderEntitlements>['data'],
  privateSmartFolderCount?: number,
  teamSmartFolderCount?: number
): SmartFolderOwnerScope {
  return isSmartFolderQuotaExhausted(
    entitlements,
    'private',
    privateSmartFolderCount
  ) &&
    !isSmartFolderQuotaExhausted(
      entitlements,
      'teamspace',
      teamSmartFolderCount
    )
    ? 'teamspace'
    : 'private';
}

export function getDefaultRootScope(ownerScope: SmartFolderOwnerScope) {
  return ownerScope === 'teamspace' ? 'teamspace' : 'private';
}

function serializeConditionsForDirtyCheck(conditions: SmartFolderCondition[]) {
  return conditions.map(condition => ({
    field: condition.field ?? null,
    operator: condition.operator ?? null,
    value: serializeConditionValueForDirtyCheck(condition.value),
  }));
}

export function getDialogSnapshot(
  name: string,
  ownerScope: SmartFolderOwnerScope,
  rootScope: SmartFolderRootScope,
  matchMode: SmartFolderMatchMode,
  conditions: SmartFolderCondition[]
) {
  return JSON.stringify({
    name,
    ownerScope,
    rootScope,
    matchMode,
    conditions: serializeConditionsForDirtyCheck(conditions),
  });
}
