import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import useSmartFolderEntitlements from '@/hooks/useSmartFolderEntitlements';
import { NamespaceTier } from '@/interface';
import {
  getConditionLimitMessage,
  getConditionLimitValue,
  isResourceConditionComplete,
  toResourceConditionApiPayload,
} from '@/page/resource/conditions/resourceConditionUtils';
import { useResourceConditions } from '@/page/resource/conditions/useResourceConditions';

import {
  getDefaultOwnerScope,
  getDefaultRootScope,
  getDialogSnapshot,
  hasSiblingNameConflict,
  isSmartFolderQuotaExhausted,
  MAX_SMART_FOLDER_NAME_LENGTH,
  normalizeInitialConditions,
} from './createSmartFolderDialogHelpers';
import type {
  CreateSmartFolderDialogProps,
  SmartFolderMatchMode,
  SmartFolderOwnerScope,
  SmartFolderRootScope,
} from './index';

export function useCreateSmartFolderDialogState({
  open,
  onOpenChange,
  onConfirm,
  currentResourceId,
  initialValue,
  defaultOwnerScope,
  hasTeamspace = true,
  privateSmartFolderCount = 0,
  teamSmartFolderCount = 0,
  siblingResources,
  siblingResourcesByScope,
  title,
  currentNamespace,
}: CreateSmartFolderDialogProps) {
  const { t } = useTranslation();
  const params = useParams();
  const namespaceId = params.namespace_id;
  const { data: entitlements } = useSmartFolderEntitlements({ namespaceId });
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [ownerScope, setOwnerScope] =
    useState<SmartFolderOwnerScope>('private');
  const [rootScope, setRootScope] = useState<SmartFolderRootScope>('private');
  const [matchMode, setMatchMode] = useState<SmartFolderMatchMode>('all');
  const [nameError, setNameError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const initialSnapshotRef = useRef('');
  const initializedDialogKeyRef = useRef('');

  const resolvedTier =
    entitlements?.tier ??
    (currentNamespace?.tier === NamespaceTier.PREMIUM ? 'premium' : 'basic');
  const maxConditionCount =
    entitlements?.ruleLimit ?? getConditionLimitValue(resolvedTier);
  const {
    conditionListRef,
    conditions,
    setConditions,
    conditionErrors,
    setConditionErrors,
    resetConditionScroll,
    addCondition,
    removeCondition,
    handleFieldChange,
    handleOperatorChange,
    handleValueChange,
  } = useResourceConditions(maxConditionCount);
  const remainingConditionCount = Math.max(
    maxConditionCount - conditions.length,
    0
  );
  const disableAddMessage = t(getConditionLimitMessage(resolvedTier));
  const showUpgradeButton = resolvedTier === 'basic';

  useEffect(() => {
    if (!open) {
      initializedDialogKeyRef.current = '';
      return;
    }

    const initialValueKey = initialValue
      ? getDialogSnapshot(
          initialValue.name || '',
          initialValue.ownerScope || 'private',
          initialValue.rootScope ||
            getDefaultRootScope(initialValue.ownerScope),
          initialValue.matchMode || 'all',
          normalizeInitialConditions(initialValue.conditions)
        )
      : `create:${defaultOwnerScope || 'auto'}`;
    if (initializedDialogKeyRef.current === initialValueKey) {
      return;
    }
    initializedDialogKeyRef.current = initialValueKey;

    const initialName = initialValue?.name || '';
    let initialOwnerScope: SmartFolderOwnerScope;
    if (initialValue) {
      initialOwnerScope = initialValue.ownerScope || 'private';
    } else if (defaultOwnerScope) {
      initialOwnerScope = defaultOwnerScope;
    } else if (hasTeamspace) {
      initialOwnerScope = getDefaultOwnerScope(
        entitlements,
        privateSmartFolderCount,
        teamSmartFolderCount
      );
    } else {
      initialOwnerScope = 'private';
    }
    const initialRootScope =
      initialOwnerScope === 'teamspace'
        ? 'teamspace'
        : initialValue?.rootScope || getDefaultRootScope(initialOwnerScope);
    const initialMatchMode = initialValue?.matchMode || 'all';
    const initialConditions = normalizeInitialConditions(
      initialValue?.conditions
    );

    setName(initialName);
    setOwnerScope(initialOwnerScope);
    setRootScope(initialRootScope);
    setMatchMode(initialMatchMode);
    setConditions(initialConditions);
    setNameError('');
    setConditionErrors({});
    setConfirmCloseOpen(false);
    resetConditionScroll();
    initialSnapshotRef.current = getDialogSnapshot(
      initialName,
      initialOwnerScope,
      initialRootScope,
      initialMatchMode,
      initialConditions
    );
    window.setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  }, [
    open,
    initialValue,
    defaultOwnerScope,
    hasTeamspace,
    entitlements,
    privateSmartFolderCount,
    teamSmartFolderCount,
  ]);

  const personalQuotaExhausted = isSmartFolderQuotaExhausted(
    entitlements,
    'private',
    privateSmartFolderCount
  );
  const teamQuotaExhausted = isSmartFolderQuotaExhausted(
    entitlements,
    'teamspace',
    teamSmartFolderCount
  );
  const ownerOptions: Array<{
    value: SmartFolderOwnerScope;
    labelKey: string;
    disabled: boolean;
    disabledMessageKey: string;
  }> = [
    {
      value: 'private',
      labelKey: 'smart_folder.scope.personal',
      disabled: personalQuotaExhausted,
      disabledMessageKey: 'smart_folder.create.personal_quota_exhausted',
    },
    {
      value: 'teamspace',
      labelKey: 'smart_folder.scope.team',
      disabled: teamQuotaExhausted,
      disabledMessageKey: 'smart_folder.create.team_quota_exhausted',
    },
  ];
  const rootScopeOptions: Array<{
    value: SmartFolderRootScope;
    labelKey: string;
  }> =
    ownerScope === 'teamspace'
      ? [{ value: 'teamspace', labelKey: 'smart_folder.scope.team' }]
      : [
          { value: 'private', labelKey: 'smart_folder.scope.personal' },
          { value: 'teamspace', labelKey: 'smart_folder.scope.team' },
          { value: 'all', labelKey: 'smart_folder.scope.all' },
        ];
  const canAddCondition = conditions.length < maxConditionCount;
  const effectiveConditions = conditions.filter(condition => condition.field);
  const ownerScopeAvailable =
    ownerOptions.find(option => option.value === ownerScope)?.disabled !== true;
  const canSubmit =
    !!name.trim() &&
    ownerScopeAvailable &&
    effectiveConditions.length > 0 &&
    effectiveConditions.every(isResourceConditionComplete);

  const validate = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError(t('smart_folder.validation.name_required'));
      return null;
    }
    if (trimmedName.length > MAX_SMART_FOLDER_NAME_LENGTH) {
      setNameError(t('smart_folder.validation.name_too_long'));
      return null;
    }
    if (!ownerScopeAvailable) {
      return null;
    }
    if (
      hasSiblingNameConflict(
        siblingResourcesByScope?.[ownerScope] ?? siblingResources,
        trimmedName,
        currentResourceId
      )
    ) {
      setNameError(t('smart_folder.validation.name_exists'));
      return null;
    }

    const nextErrors: Record<number, string> = {};
    const validConditions = conditions.filter(condition => condition.field);
    validConditions.forEach(condition => {
      const sourceIndex = conditions.indexOf(condition);
      if (!isResourceConditionComplete(condition)) {
        nextErrors[sourceIndex] = t(
          'smart_folder.validation.condition_incomplete'
        );
      }
    });

    if (Object.keys(nextErrors).length > 0 || validConditions.length <= 0) {
      if (validConditions.length <= 0) {
        nextErrors[0] = t('smart_folder.validation.condition_incomplete');
      }
      setConditionErrors(nextErrors);
      return null;
    }

    setNameError('');
    setConditionErrors({});
    const conditionPayload = toResourceConditionApiPayload({
      matchMode: validConditions.length > 1 ? matchMode : 'all',
      conditions: validConditions,
    });

    return {
      name: trimmedName,
      owner_scope: ownerScope,
      root_scope: rootScope,
      ...conditionPayload,
    };
  };

  const handleConfirm = async () => {
    const payload = validate();
    if (!payload) {
      return;
    }

    setSubmitting(true);
    try {
      await onConfirm(payload);
      closeDialog();
    } catch {
      // Keep dialog open when request fails.
    } finally {
      setSubmitting(false);
    }
  };

  const dialogTitle = useMemo(
    () => title || t('smart_folder.create.title'),
    [t, title]
  );

  const hasUnsavedChanges =
    getDialogSnapshot(name, ownerScope, rootScope, matchMode, conditions) !==
    initialSnapshotRef.current;

  const closeDialog = () => {
    setConfirmCloseOpen(false);
    onOpenChange(false);
  };

  const handleRequestClose = () => {
    if (submitting) {
      return;
    }

    if (!hasUnsavedChanges) {
      closeDialog();
      return;
    }

    setConfirmCloseOpen(true);
  };

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      onOpenChange(true);
      return;
    }

    handleRequestClose();
  };

  const handleNameChange = (nextName: string) => {
    setName(nextName);
    setNameError(
      nextName.trim().length > MAX_SMART_FOLDER_NAME_LENGTH
        ? t('smart_folder.validation.name_too_long')
        : ''
    );
  };

  return {
    t,
    namespaceId,
    inputRef,
    conditionListRef,
    name,
    ownerScope,
    setOwnerScope,
    rootScope,
    setRootScope,
    matchMode,
    setMatchMode,
    conditions,
    nameError,
    conditionErrors,
    submitting,
    confirmCloseOpen,
    setConfirmCloseOpen,
    maxConditionCount,
    remainingConditionCount,
    disableAddMessage,
    showUpgradeButton,
    ownerOptions,
    rootScopeOptions,
    canAddCondition,
    canSubmit,
    addCondition,
    removeCondition,
    handleFieldChange,
    handleOperatorChange,
    handleValueChange,
    handleConfirm,
    dialogTitle,
    closeDialog,
    handleRequestClose,
    handleDialogOpenChange,
    handleNameChange,
  };
}
