const searchScrollbarClassName =
  '[scrollbar-width:thin] [scrollbar-color:hsl(var(--border))_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent';

export const searchResultListClassName = `relative h-full max-h-none overflow-y-auto overflow-x-hidden pr-2 ${searchScrollbarClassName}`;

export const searchResultGroupClassName =
  'p-0 !px-0 [&_[cmdk-group-heading]]:!px-0 [&_[cmdk-group-heading]]:py-0 [&_[cmdk-group-heading]]:text-base [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:leading-6';

export const searchResultEmptyItemClassName = 'mt-2 rounded-lg !p-2';

export const searchResultLoadingClassName =
  'absolute inset-0 flex items-center justify-center text-muted-foreground';

export const searchResultItemClassName =
  'my-1 cursor-pointer rounded-lg !px-2 !py-0 data-[selected=true]:bg-accent';

export const searchResultRowWithPreviewClassName =
  'flex min-h-[62px] w-full flex-col items-start rounded-lg px-0 py-2 text-left text-foreground no-underline outline-none';

export const searchResultRowWithoutPreviewClassName =
  'flex h-11 w-full flex-col items-start rounded-lg px-0 py-2.5 text-left text-foreground no-underline outline-none';

export const searchResultInlineRowClassName =
  'flex min-w-0 flex-1 items-center gap-2 rounded-lg px-0 py-1 text-left text-foreground no-underline outline-none';
