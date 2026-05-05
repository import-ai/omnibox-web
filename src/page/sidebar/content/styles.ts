// Shared menu styles for action.tsx and contextMenu.tsx

// Menu item base style
export const menuItemClass = 'cursor-pointer gap-2 text-popover-foreground';

// Menu icon base style
export const menuIconClass = 'size-4 text-neutral-500 dark:text-[#a1a1a1]';

export const smartFolderDialogContentClass =
  'max-h-[90vh] w-[calc(100vw-32px)] gap-5 overflow-y-auto rounded-xl sm:max-w-[690px] sm:p-7';

export const smartFolderDialogTitleClass =
  'text-lg font-semibold leading-7 text-foreground';

export const smartFolderFieldLabelClass =
  'flex h-9 items-center whitespace-nowrap text-sm font-medium text-foreground';

export const smartFolderNameRowClass =
  'grid grid-cols-1 items-start gap-2 sm:grid-cols-[128px_1fr] sm:gap-3';

export const smartFolderMatchRowClass =
  'flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3';

export const smartFolderConditionGridClass =
  'grid grid-cols-2 items-center gap-2 sm:grid-cols-[132px_132px_minmax(260px,1fr)_16px]';

export const smartFolderSelectTriggerClass =
  'h-9 rounded-md border-line bg-transparent px-3 text-sm text-foreground shadow-none hover:bg-transparent focus:ring-0 focus:ring-transparent focus:outline-none';

export const smartFolderInputClass =
  'h-9 rounded-md border-line text-sm shadow-none focus:outline-none';

export const smartFolderIconButtonClass =
  'size-4 rounded-none border-none bg-transparent p-0 shadow-none hover:bg-transparent';

export const smartFolderFooterButtonClass =
  'h-9 w-full rounded-lg px-4 sm:w-auto';

export const smartFolderConditionErrorClass =
  'text-xs text-destructive sm:pl-[272px]';

export const smartFolderMutedTextClass = 'text-xs text-muted-foreground';
