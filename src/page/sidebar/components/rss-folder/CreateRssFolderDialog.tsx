import { Plus, X } from 'lucide-react';

import { Button } from '@/components/button';
import ActionDialog from '@/components/invite-dialog/ActionDialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/tooltip';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { UpgradeActionButton } from '@/components/upgrade-action-button';
import { cn } from '@/lib/utils';
import {
  resourceConditionFieldLabelClass,
  resourceConditionInputClass,
} from '@/page/resource/conditions/styles';
import { SmartFolderDialogFooter } from '@/page/sidebar/components/smart-folder/SmartFolderDialogFooter';

import type { CreateRssFolderDialogProps } from './index';
import { RssFolderUnsavedDialog } from './RssFolderUnsavedDialog';
import { useCreateRssFolderDialogState } from './useCreateRssFolderDialogState';

export function CreateRssFolderDialog(props: CreateRssFolderDialogProps) {
  const { open, confirmText, currentNamespace } = props;
  const state = useCreateRssFolderDialogState(props);
  const {
    t,
    namespaceId,
    inputRef,
    linkListRef,
    name,
    rows,
    nameError,
    submitting,
    confirmCloseOpen,
    setConfirmCloseOpen,
    maxLinkCount,
    remainingLinkCount,
    showUpgradeButton,
    canAddLink,
    disableAddMessage,
    canSubmit,
    addLink,
    removeLink,
    handleLinkUrlChange,
    handleLinkNameChange,
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
          <div className="space-y-1.5">
            <Label
              htmlFor="rss-folder-name"
              className={resourceConditionFieldLabelClass}
            >
              {t('rss_folder.create.name')}
            </Label>
            <Input
              ref={inputRef}
              id="rss-folder-name"
              value={name}
              autoComplete="off"
              placeholder={t('rss_folder.create.placeholder')}
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

          <div className="flex items-center justify-end gap-2">
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <span
                  tabIndex={showUpgradeButton ? 0 : undefined}
                  className="cursor-default whitespace-nowrap text-xs text-muted-foreground sm:text-sm"
                >
                  {t('rss_folder.create.remaining_links', {
                    remaining: remainingLinkCount,
                    total: maxLinkCount,
                  })}
                </span>
              </TooltipTrigger>
              {showUpgradeButton && (
                <TooltipContent side="top">
                  {t('rss_folder.create.link_limit_tooltip')}
                </TooltipContent>
              )}
            </Tooltip>
            {showUpgradeButton && (
              <UpgradeActionButton
                namespaceId={namespaceId}
                hasPermission={currentNamespace?.is_owner !== false}
                disabledReason={t('chat.trial.not_owner')}
              />
            )}
          </div>

          <div
            ref={linkListRef}
            className="no-scrollbar max-h-72 space-y-4 overflow-y-auto sm:max-h-[300px]"
          >
            {rows.map((row, index) => (
              <div key={index}>
                {index > 0 && (
                  <div className="mb-4 h-px bg-slate-100 dark:bg-neutral-800" />
                )}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor={`rss-folder-link-${index}`}
                      className={resourceConditionFieldLabelClass}
                    >
                      {t('rss_folder.create.link', { index: index + 1 })}
                    </Label>
                    <Input
                      id={`rss-folder-link-${index}`}
                      value={row.url}
                      autoComplete="off"
                      placeholder={t('rss_folder.create.url_placeholder')}
                      onChange={event =>
                        handleLinkUrlChange(index, event.target.value)
                      }
                      className={cn(
                        resourceConditionInputClass,
                        'focus-visible:ring-0 focus-visible:ring-transparent',
                        row.error && 'border-destructive'
                      )}
                    />
                    {row.error && (
                      <p className="text-xs text-destructive">{row.error}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor={`rss-folder-link-name-${index}`}
                        className={resourceConditionFieldLabelClass}
                      >
                        {t('rss_folder.create.link_name')}
                      </Label>
                      {rows.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          className="size-6 p-0 text-muted-foreground hover:text-foreground"
                          aria-label={t('delete')}
                          onClick={() => removeLink(index)}
                        >
                          <X className="size-4" />
                        </Button>
                      )}
                    </div>
                    <Input
                      id={`rss-folder-link-name-${index}`}
                      value={row.name}
                      autoComplete="off"
                      placeholder={t('rss_folder.create.link_name_placeholder')}
                      onChange={event =>
                        handleLinkNameChange(index, event.target.value)
                      }
                      className={cn(
                        resourceConditionInputClass,
                        'focus-visible:ring-0 focus-visible:ring-transparent'
                      )}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex w-fit">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 gap-1 px-0 text-sm font-normal hover:bg-transparent"
                  onClick={addLink}
                  disabled={!canAddLink}
                >
                  <Plus className="size-4" />
                  {t('rss_folder.create.add_link')}
                </Button>
              </span>
            </TooltipTrigger>
            {!canAddLink && (
              <TooltipContent>{disableAddMessage}</TooltipContent>
            )}
          </Tooltip>
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

      <RssFolderUnsavedDialog
        open={confirmCloseOpen}
        onOpenChange={setConfirmCloseOpen}
        onConfirm={closeDialog}
      />
    </>
  );
}
