import { Plus } from 'lucide-react';
import { Fragment } from 'react';

import { Button } from '@/components/button';
import ActionDialog from '@/components/invite-dialog/action-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
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
import {
  UpgradeActionButton,
  UpgradeTrialUsageTooltip,
} from '@/components/upgrade-action-button';
import { cn } from '@/lib/utils';

import { getDefaultRootScope } from './create-smart-folder-dialog-helpers';
import { CreateSmartFolderDialogProps } from './create-smart-folder-dialog-types';
import { SmartFolderConditionRow } from './smart-folder-condition-row';
import { SmartFolderDialogFooter } from './smart-folder-dialog-footer';
import {
  SmartFolderMatchMode,
  SmartFolderOwnerScope,
  SmartFolderRootScope,
} from './smart-folder-types';
import { SmartFolderUnsavedDialog } from './smart-folder-unsaved-dialog';
import {
  smartFolderDialogContentClass,
  smartFolderDialogTitleClass,
  smartFolderFieldLabelClass,
  smartFolderInputClass,
  smartFolderNameRowClass,
  smartFolderSelectTriggerClass,
} from './styles';
import { useCreateSmartFolderDialogState } from './use-create-smart-folder-dialog-state';

export function CreateSmartFolderDialog(props: CreateSmartFolderDialogProps) {
  const { open, hasTeamspace = true, confirmText, currentNamespace } = props;
  const state = useCreateSmartFolderDialogState(props);
  const {
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
  } = state;

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
          onContextMenu: event => event.stopPropagation(),
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
                            className="h-4 w-4 border-border dark:disabled:bg-neutral-300 disabled:bg-neutral-400 text-blue-500 dark:border-none dark:bg-white"
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

              <div className={cn(smartFolderNameRowClass)}>
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
                    className={cn(smartFolderSelectTriggerClass, 'sm:w-44')}
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
                autoComplete="off"
                placeholder={t('smart_folder.create.placeholder')}
                onChange={event => handleNameChange(event.target.value)}
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
            <div className={cn(smartFolderNameRowClass, 'items-center')}>
              <p className={smartFolderFieldLabelClass}>
                {t('smart_folder.create.conditions')}
              </p>
              <div className="flex items-center gap-2">
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
                <div className="ml-auto flex items-center gap-2">
                  <UpgradeTrialUsageTooltip
                    textKey="smart_folder.create.remaining_conditions"
                    textValues={{
                      remaining: remainingConditionCount,
                      total: maxConditionCount,
                    }}
                    tooltipItems={[disableAddMessage]}
                  />
                  {showUpgradeButton && (
                    <UpgradeActionButton
                      namespaceId={namespaceId}
                      hasPermission={currentNamespace?.is_owner !== false}
                      disabledReason={t('chat.trial.not_owner')}
                    />
                  )}
                </div>
              </div>
            </div>

            <div
              ref={conditionListRef}
              className="max-h-56 overflow-y-auto pr-1"
            >
              {conditions.map((condition, index) => (
                <Fragment key={index}>
                  {index > 0 && <div className="my-5 h-px bg-slate-100" />}
                  <SmartFolderConditionRow
                    index={index}
                    condition={condition}
                    conditionError={conditionErrors[index]}
                    hideRemove={conditions.length <= 1}
                    onRemove={removeCondition}
                    onFieldChange={handleFieldChange}
                    onOperatorChange={handleOperatorChange}
                    onValueChange={handleValueChange}
                  />
                </Fragment>
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

        <SmartFolderDialogFooter
          canSubmit={canSubmit}
          confirmText={confirmText}
          name={name}
          submitting={submitting}
          onCancel={handleRequestClose}
          onConfirm={handleConfirm}
        />
      </ActionDialog>

      <SmartFolderUnsavedDialog
        open={confirmCloseOpen}
        onOpenChange={setConfirmCloseOpen}
        onConfirm={closeDialog}
      />
    </>
  );
}
