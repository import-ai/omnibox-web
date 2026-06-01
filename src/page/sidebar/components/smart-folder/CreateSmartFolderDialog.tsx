import ActionDialog from '@/components/invite-dialog/ActionDialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/RadioGroup';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { UpgradeActionButton } from '@/components/upgrade-action-button';
import { cn } from '@/lib/utils';
import { ResourceConditionEditor } from '@/page/resource/conditions/ResourceConditionEditor';
import {
  resourceConditionFieldLabelClass,
  resourceConditionInputClass,
  resourceConditionNameRowClass,
  resourceConditionSelectTriggerClass,
} from '@/page/resource/conditions/styles';

import { getDefaultRootScope } from './createSmartFolderDialogHelpers';
import type {
  CreateSmartFolderDialogProps,
  SmartFolderMatchMode,
  SmartFolderOwnerScope,
  SmartFolderRootScope,
} from './index';
import { SmartFolderDialogFooter } from './SmartFolderDialogFooter';
import { SmartFolderUnsavedDialog } from './SmartFolderUnsavedDialog';
import { useCreateSmartFolderDialogState } from './useCreateSmartFolderDialogState';

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
        contentClassName="max-h-[90vh] w-[calc(100vw-32px)] gap-5 overflow-y-auto rounded-xl bg-white pt-5 dark:bg-neutral-900 sm:max-w-[650px] sm:px-7 sm:pb-7 sm:pt-5"
        titleClassName="text-lg font-semibold leading-7 text-foreground"
        closeClassName="size-6"
        closeWrapperClassName="right-5 top-5"
        contentProps={{
          onContextMenu: event => event.stopPropagation(),
        }}
      >
        <div className="space-y-4">
          {hasTeamspace && (
            <>
              <div className={cn(resourceConditionNameRowClass)}>
                <p className={resourceConditionFieldLabelClass}>
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

              <div className={cn(resourceConditionNameRowClass)}>
                <Label className={resourceConditionFieldLabelClass}>
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
                      resourceConditionSelectTriggerClass,
                      'sm:w-44'
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

          <div className={cn(resourceConditionNameRowClass, 'items-center')}>
            <Label
              htmlFor="smart-folder-name"
              className={resourceConditionFieldLabelClass}
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
                  resourceConditionInputClass,
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

          <div>
            <ResourceConditionEditor
              conditions={conditions}
              conditionErrors={conditionErrors}
              conditionListRef={conditionListRef}
              canAddCondition={canAddCondition}
              addButtonTooltip={disableAddMessage}
              headerClassName={cn(
                resourceConditionNameRowClass,
                'items-center'
              )}
              onAddCondition={addCondition}
              onRemoveCondition={removeCondition}
              onFieldChange={handleFieldChange}
              onOperatorChange={handleOperatorChange}
              onValueChange={handleValueChange}
              headerContent={
                <div className="flex items-center gap-2">
                  {conditions.length > 1 && (
                    <Select
                      value={matchMode}
                      onValueChange={value =>
                        setMatchMode(value as SmartFolderMatchMode)
                      }
                    >
                      <SelectTrigger
                        className={cn(
                          resourceConditionSelectTriggerClass,
                          'w-[133px]'
                        )}
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
                    <span className="cursor-default text-sm text-muted-foreground">
                      {t('smart_folder.create.remaining_conditions', {
                        remaining: remainingConditionCount,
                        total: maxConditionCount,
                      })}
                    </span>
                    {showUpgradeButton && (
                      <UpgradeActionButton
                        namespaceId={namespaceId}
                        hasPermission={currentNamespace?.is_owner !== false}
                        disabledReason={t('chat.trial.not_owner')}
                      />
                    )}
                  </div>
                </div>
              }
            />
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
