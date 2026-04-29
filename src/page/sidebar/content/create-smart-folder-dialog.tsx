import { Plus } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { Button } from '@/components/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UpgradeActionButton } from '@/components/upgrade-action-button';
import useProNamespaces from '@/hooks/use-pro-namespaces';
import useSmartFolderEntitlements from '@/hooks/use-smart-folder-entitlements';
import { NamespaceTier, ResourceMeta } from '@/interface';
import { cn } from '@/lib/utils';
import ActionDialog from '@/page/sidebar/switcher/action-dialog';

import { SmartFolderConditionRow } from './smart-folder-condition-row';
import {
  CreateSmartFolderPayload,
  SmartFolderCondition,
  SmartFolderField,
  SmartFolderMatchMode,
  SmartFolderOperator,
  SmartFolderOwnerScope,
  SmartFolderRootScope,
} from './smart-folder-types';
import {
  createDefaultCondition,
  fromSmartFolderApiCondition,
  getConditionLimitMessage,
  getConditionLimitValue,
  getDefaultOperator,
  getInitialConditionForField,
  isConditionComplete,
  normalizeConditionValue,
  normalizeSmartFolderPayload,
  shouldShowValueInput,
  toSmartFolderApiPayload,
} from './smart-folder-utils';
import { stopRootContextMenuPropagation } from './space-menu';
import {
  smartFolderDialogContentClass,
  smartFolderDialogTitleClass,
  smartFolderFieldLabelClass,
  smartFolderFooterButtonClass,
  smartFolderInputClass,
  smartFolderMatchRowClass,
  smartFolderNameRowClass,
  smartFolderSelectTriggerClass,
} from './styles';

const MAX_NAME_LENGTH = 128;
interface CreateSmartFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: CreateSmartFolderPayload) => Promise<void>;
  currentResourceId?: string;
  initialValue?: CreateSmartFolderPayload | null;
  hasTeamspace?: boolean;
  privateSmartFolderCount?: number;
  teamSmartFolderCount?: number;
  siblingResources?: ResourceMeta[];
  title?: string;
  confirmText?: string;
}

function hasSiblingNameConflict(
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

function normalizeInitialConditions(
  conditions?: SmartFolderCondition[]
): SmartFolderCondition[] {
  if (!conditions?.length) {
    return [createDefaultCondition()];
  }

  return conditions.map(condition => {
    const normalizedCondition = fromSmartFolderApiCondition(condition);

    if (!normalizedCondition?.field) {
      return {};
    }

    return {
      ...normalizedCondition,
      value: normalizeConditionValue(
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
  return scope === 'private'
    ? (entitlements?.privateLimit ?? 1)
    : (entitlements?.teamLimit ?? 1);
}

function isSmartFolderQuotaExhausted(
  entitlements: ReturnType<typeof useSmartFolderEntitlements>['data'],
  scope: SmartFolderOwnerScope,
  actualCount?: number
) {
  const limit = getSmartFolderQuotaLimit(entitlements, scope);
  return (
    limit >= 0 &&
    getSmartFolderQuotaUsed(entitlements, scope, actualCount) >= limit
  );
}

function getDefaultOwnerScope(
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

function getDefaultRootScope(ownerScope: SmartFolderOwnerScope) {
  return ownerScope === 'teamspace' ? 'teamspace' : 'private';
}

function serializeConditionsForDirtyCheck(conditions: SmartFolderCondition[]) {
  return conditions.map(condition => ({
    field: condition.field ?? null,
    operator: condition.operator ?? null,
    value: serializeConditionValueForDirtyCheck(condition.value),
  }));
}

function getDialogSnapshot(
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

export function CreateSmartFolderDialog({
  open,
  onOpenChange,
  onConfirm,
  currentResourceId,
  initialValue,
  hasTeamspace = true,
  privateSmartFolderCount = 0,
  teamSmartFolderCount = 0,
  siblingResources,
  title,
  confirmText,
}: CreateSmartFolderDialogProps) {
  const { t } = useTranslation();
  const params = useParams();
  const namespaceId = params.namespace_id;
  const { data: proNamespaces } = useProNamespaces();
  const { data: entitlements } = useSmartFolderEntitlements({ namespaceId });
  const inputRef = useRef<HTMLInputElement>(null);
  const conditionListRef = useRef<HTMLDivElement>(null);
  const shouldScrollToLatestConditionRef = useRef(false);
  const [name, setName] = useState('');
  const [ownerScope, setOwnerScope] =
    useState<SmartFolderOwnerScope>('private');
  const [rootScope, setRootScope] = useState<SmartFolderRootScope>('private');
  const [matchMode, setMatchMode] = useState<SmartFolderMatchMode>('all');
  const [conditions, setConditions] = useState<SmartFolderCondition[]>([
    createDefaultCondition(),
  ]);
  const [nameError, setNameError] = useState('');
  const [conditionErrors, setConditionErrors] = useState<
    Record<number, string>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const currentNamespace = proNamespaces.find(item => item.id === namespaceId);
  const resolvedTier =
    entitlements?.tier ??
    (currentNamespace?.tier === NamespaceTier.PREMIUM ? 'premium' : 'basic');
  const maxConditionCount =
    entitlements?.ruleLimit ?? getConditionLimitValue(resolvedTier);
  const remainingConditionCount = Math.max(
    maxConditionCount - conditions.length,
    0
  );
  const disableAddMessage = t(getConditionLimitMessage(resolvedTier));
  const showUpgradeButton = resolvedTier === 'basic';
  const initialSnapshotRef = useRef('');

  useEffect(() => {
    if (!shouldScrollToLatestConditionRef.current) {
      return;
    }

    shouldScrollToLatestConditionRef.current = false;
    conditionListRef.current?.scrollTo({
      top: conditionListRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [conditions.length]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const initialName = initialValue?.name || '';
    const initialOwnerScope = hasTeamspace
      ? initialValue?.ownerScope ||
        getDefaultOwnerScope(
          entitlements,
          privateSmartFolderCount,
          teamSmartFolderCount
        )
      : 'private';
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
    shouldScrollToLatestConditionRef.current = false;
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
    effectiveConditions.every(isConditionComplete);

  const addCondition = (afterIndex?: number) => {
    if (!canAddCondition) {
      return;
    }

    shouldScrollToLatestConditionRef.current = true;
    setConditions(prev => {
      const next = [...prev];
      next.splice((afterIndex ?? prev.length - 1) + 1, 0, {});
      return next;
    });
  };

  const removeCondition = (index: number) => {
    if (conditions.length <= 1) {
      return;
    }

    setConditions(prev =>
      prev.filter((_, currentIndex) => currentIndex !== index)
    );
    setConditionErrors(prev => {
      const nextErrors: Record<number, string> = {};
      Object.entries(prev).forEach(([key, value]) => {
        const currentIndex = Number(key);
        if (currentIndex < index) {
          nextErrors[currentIndex] = value;
        }
        if (currentIndex > index) {
          nextErrors[currentIndex - 1] = value;
        }
      });
      return nextErrors;
    });
  };

  const updateCondition = (
    index: number,
    patch: Partial<SmartFolderCondition>
  ) => {
    setConditions(prev =>
      prev.map((condition, currentIndex) =>
        currentIndex === index ? { ...condition, ...patch } : condition
      )
    );
    setConditionErrors(prev => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const handleFieldChange = (index: number, field: SmartFolderField) => {
    updateCondition(index, getInitialConditionForField(field));
  };

  const handleOperatorChange = (
    index: number,
    operator: SmartFolderOperator
  ) => {
    const currentCondition = conditions[index];
    updateCondition(index, {
      operator,
      value: normalizeConditionValue(
        currentCondition.field,
        operator,
        shouldShowValueInput(operator) ? currentCondition.value : undefined
      ),
    });
  };

  const handleValueChange = (
    index: number,
    value: SmartFolderCondition['value']
  ) => {
    const currentCondition = conditions[index];
    updateCondition(index, {
      value: normalizeConditionValue(
        currentCondition.field,
        currentCondition.operator || getDefaultOperator(currentCondition.field),
        value
      ),
    });
  };

  const validate = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError(t('smart_folder.validation.name_required'));
      return null;
    }
    if (name.length > MAX_NAME_LENGTH) {
      setNameError(t('smart_folder.validation.name_too_long'));
      return null;
    }
    if (!ownerScopeAvailable) {
      return null;
    }
    if (
      hasSiblingNameConflict(siblingResources, trimmedName, currentResourceId)
    ) {
      setNameError(t('smart_folder.validation.name_exists'));
      return null;
    }

    const nextErrors: Record<number, string> = {};
    const validConditions = conditions.filter(condition => condition.field);
    validConditions.forEach(condition => {
      const sourceIndex = conditions.indexOf(condition);
      if (!isConditionComplete(condition)) {
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
    return toSmartFolderApiPayload(
      normalizeSmartFolderPayload({
        name: trimmedName,
        ownerScope,
        rootScope,
        matchMode: validConditions.length > 1 ? matchMode : 'all',
        conditions: validConditions,
      })
    );
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

  return (
    <>
      <ActionDialog
        title={dialogTitle}
        open={open}
        onOpenChange={handleDialogOpenChange}
        contentClassName={smartFolderDialogContentClass}
        titleClassName={smartFolderDialogTitleClass}
        closeClassName="size-6 mr-2"
        closeWrapperClassName="right-5 top-6"
        contentProps={{
          onContextMenu: stopRootContextMenuPropagation,
        }}
      >
        <div className="space-y-4">
          {hasTeamspace && (
            <>
              <div className={cn(smartFolderNameRowClass)}>
                <p className={smartFolderFieldLabelClass}>
                  {t('smart_folder.create.owner_scope')}
                </p>
                <RadioGroup
                  value={ownerScope}
                  onValueChange={value => {
                    const nextOwnerScope = value as SmartFolderOwnerScope;
                    setOwnerScope(nextOwnerScope);
                    setRootScope(getDefaultRootScope(nextOwnerScope));
                  }}
                  className="flex h-9 flex-wrap items-center gap-8"
                >
                  {ownerOptions.map(option => (
                    <Tooltip key={option.value}>
                      <TooltipTrigger asChild>
                        <span className="inline-flex h-9 items-center gap-3">
                          <RadioGroupItem
                            value={option.value}
                            id={`smart-folder-owner-${option.value}`}
                            disabled={option.disabled}
                            className="h-4 w-4 border-border text-blue-500 dark:border-none dark:bg-white"
                          />
                          <Label
                            htmlFor={`smart-folder-owner-${option.value}`}
                            className="cursor-pointer text-sm text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
                          >
                            {t(option.labelKey)}
                          </Label>
                        </span>
                      </TooltipTrigger>
                      {option.disabled && (
                        <TooltipContent>
                          {t(option.disabledMessageKey)}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  ))}
                </RadioGroup>
              </div>

              <div className={smartFolderNameRowClass}>
                <Label className={smartFolderFieldLabelClass}>
                  {t('smart_folder.create.root_scope')}
                </Label>
                <Select
                  value={rootScope}
                  onValueChange={value =>
                    setRootScope(value as SmartFolderRootScope)
                  }
                >
                  <SelectTrigger
                    className={cn(
                      smartFolderSelectTriggerClass,
                      'sm:w-[360px]'
                    )}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {rootScopeOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {t(option.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div className={cn(smartFolderNameRowClass, 'items-center')}>
            <Label
              htmlFor="smart-folder-name"
              className={smartFolderFieldLabelClass}
            >
              {t('smart_folder.create.name')}
            </Label>
            <div className="space-y-1.5">
              <Input
                ref={inputRef}
                id="smart-folder-name"
                value={name}
                placeholder={t('folder.create_dialog.placeholder')}
                onChange={event => {
                  const nextName = event.target.value;

                  setName(nextName);
                  setNameError(
                    nextName.length > MAX_NAME_LENGTH
                      ? t('smart_folder.validation.name_too_long')
                      : ''
                  );
                }}
                className={cn(
                  smartFolderInputClass,
                  'text-base',
                  'focus-visible:ring-0 focus-visible:ring-transparent',
                  nameError && 'border-destructive'
                )}
              />
              {nameError && (
                <p className="text-xs text-destructive">{nameError}</p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div
              className={cn(
                smartFolderMatchRowClass,
                'items-center justify-between gap-3'
              )}
            >
              <p className={cn(smartFolderFieldLabelClass, 'sm:w-[128px]')}>
                {t('smart_folder.create.conditions')}
              </p>
              <div className="flex flex-1 items-center justify-end gap-2">
                {conditions.length > 1 && (
                  <Select
                    value={matchMode}
                    onValueChange={value =>
                      setMatchMode(value as SmartFolderMatchMode)
                    }
                  >
                    <SelectTrigger
                      className={cn(smartFolderSelectTriggerClass, 'w-[133px]')}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        {t('smart_folder.match_mode.all')}
                      </SelectItem>
                      <SelectItem value="any">
                        {t('smart_folder.match_mode.any')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
                <p className="text-sm text-foreground">
                  {t('smart_folder.create.remaining_conditions', {
                    remaining: remainingConditionCount,
                    total: maxConditionCount,
                  })}
                </p>
                {showUpgradeButton && (
                  <UpgradeActionButton
                    namespaceId={namespaceId}
                    hasPermission={currentNamespace?.is_owner !== false}
                    disabledReason={t('chat.trial.not_owner')}
                  />
                )}
              </div>
            </div>

            <div
              ref={conditionListRef}
              className="max-h-[232px] space-y-2 overflow-y-auto pr-1"
            >
              {conditions.map((condition, index) => (
                <SmartFolderConditionRow
                  key={index}
                  index={index}
                  condition={condition}
                  conditionError={conditionErrors[index]}
                  hideRemove={conditions.length <= 1}
                  onRemove={removeCondition}
                  onFieldChange={handleFieldChange}
                  onOperatorChange={handleOperatorChange}
                  onValueChange={handleValueChange}
                />
              ))}
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex w-fit">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-8 gap-1 px-0 text-sm font-normal hover:bg-transparent"
                    onClick={() => addCondition(conditions.length - 1)}
                    disabled={!canAddCondition}
                  >
                    <Plus className="size-4" />
                    {t('smart_folder.create.add_condition')}
                  </Button>
                </span>
              </TooltipTrigger>
              {!canAddCondition && (
                <TooltipContent>{disableAddMessage}</TooltipContent>
              )}
            </Tooltip>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end sm:space-x-2">
          <Button
            variant="outline"
            className={smartFolderFooterButtonClass}
            onClick={handleRequestClose}
            disabled={submitting}
          >
            {t('cancel')}
          </Button>
          <Button
            className={smartFolderFooterButtonClass}
            onClick={handleConfirm}
            disabled={!name.trim() || !canSubmit || submitting}
            loading={submitting}
          >
            {confirmText || t('create')}
          </Button>
        </div>
      </ActionDialog>

      <AlertDialog open={confirmCloseOpen} onOpenChange={setConfirmCloseOpen}>
        <AlertDialogContent className="max-w-[560px]">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('smart_folder.create.unsaved_title')}
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cancel-btn-outline">
              {t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={closeDialog}>
              {t('ok')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
