# DESIGN.md

UI conventions for OmniBox Web. Follow them for new UI and when reworking
existing screens. When a convention here conflicts with older code, this file
wins; update the older code when you touch it.

## Settings pages

Settings tabs render inside the settings dialog's content area
(`src/page/settings/SettingWrapper.tsx`). There is no shared page component:
compose each tab from the patterns below with the listed classes so every tab
reads the same. Desktop tabs added through `settingsExtensions` follow the same
rules.

Reference implementations:

- `src/page/localRuntime/DeviceSettings.tsx` - page header, item cards, rename
  popover, destructive confirmation, list table, detail dialog
- `omnibox-desktop/renderer/RuntimeSettings.tsx` - setting rows with switches
  and a dropdown, disabled state, status chip, inline alert
- `src/page/settings/tabs/featurePreviews/FeaturePreviewsForm.tsx` - setting
  rows
- `src/page/settings/tabs/account/APIKeyForm.tsx` - item cards
- `src/page/settings/tabs/members/tasks/TaskList.tsx` - list table

### Page header

Every tab starts with a title and a one-sentence description, followed by a
separator:

```tsx
<div className="flex flex-col gap-2.5">
  <h3 className="text-base font-semibold text-foreground">{title}</h3>
  <p className="text-sm text-muted-foreground">{description}</p>
</div>
<Separator className="my-6" />
```

- Use `h3` with `text-base`. Do not use `h2` or `text-lg` for tab titles.
- Separate major sections with another `<Separator className="my-6" />`.
- Section headings inside a tab use
  `text-sm font-semibold text-foreground lg:text-base`. When a section has an
  action, put it on the right:
  `flex items-center justify-between gap-2`.
- The dialog's close button sits in the top-right corner; keep the header
  clear of it.

### Setting rows

A setting is one row: icon, label with an optional hint, and the control on the
right.

```tsx
<div className="grid w-full grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-2 px-2 py-2">
  <Icon className="size-4 text-muted-foreground" />
  <span className="min-w-0">
    <span className="block text-sm font-medium leading-5 text-foreground">
      {label}
    </span>
    <span className="block whitespace-normal text-xs leading-4 text-muted-foreground">
      {hint}
    </span>
  </span>
  <Switch className="shrink-0" />
</div>
```

- Stack rows with `flex flex-col gap-2`.
- The control is always on the right. Do not put a switch before its label.
- The hint explains the consequence of the current value, not the label again.
  When the value changes, update the hint. For example, a policy dropdown
  shows the selected policy's effect.
- When a row depends on another setting that is off, add `opacity-50` to the
  row and disable its control. Keep the row visible so users can see what they
  would enable.
- Read-only values use the row layout with the value as the hint and a chip on
  the right, not a sentence.

### Controls

| Need                     | Use                                                                                | Do not use         |
| ------------------------ | ---------------------------------------------------------------------------------- | ------------------ |
| On/off                   | `Switch` from `@/components/ui/Switch`                                             | Native checkbox    |
| Pick one of a few values | `DropdownMenu` with an outline `Button` trigger and a `Check` on the selected item | Native `<select>`  |
| Text entry               | `Input` and `Label`                                                                | Unstyled `<input>` |
| Confirm a risky action   | `AlertDialog`                                                                      | `window.confirm`   |
| Page-level problem       | `Alert variant="destructive"`                                                      | Bare red text      |

- Dropdown trigger:
  `<Button variant="outline" className="h-8 w-[180px] justify-between rounded-md border-border bg-transparent px-3 font-normal shadow-none">`
  with a trailing `ChevronDown className="size-4"`. The content uses the same
  width; items use `flex justify-between` with `Check className="size-4"` on
  the selected one. See `src/page/settings/tabs/basic/Theme.tsx`.
- Small action buttons in a section header:
  `className="h-[30px] w-[71px] shrink-0 text-xs font-medium"`.
- Icon-only actions are plain buttons with a `Tooltip`, an `aria-label`, and a
  `size-4 text-muted-foreground` icon. Use `hover:opacity-70`. Delete icons
  add `group-hover:text-destructive`.
- Settings save immediately. Do not add a separate save button for a switch or
  dropdown.

### Item cards

Use a bordered card for each configurable item, such as a device or an API key:

```tsx
<div className="flex flex-col gap-4 rounded-md border border-border p-5">
  <div className="flex items-start justify-between gap-3">
    <div className="group flex min-w-0 items-center gap-1">
      <span className="truncate text-sm font-semibold text-foreground">
        {name}
      </span>
      {/* rename trigger */}
    </div>
    {/* icon actions */}
  </div>
  {/* chips, then labeled fields */}
</div>
```

- Rename in place with a `Popover` opened by a pencil icon that appears on
  hover (`md:opacity-0 md:group-hover:opacity-100 md:data-[state=open]:opacity-100`).
  The popover holds a `Label`, an `Input` with a length counter, and a
  right-aligned `h-8` submit button. Enter saves. See
  `src/page/settings/tabs/members/MemberDisplayEditor.tsx`.
- Labeled fields put the label above the value:
  `flex flex-col gap-1`, label `text-sm text-muted-foreground`, value
  `text-sm font-semibold text-foreground`.
- Hide items that can no longer be acted on, such as revoked devices, instead
  of listing them with a disabled state.

### Lists and tables

Use a table for history or other lists with several comparable columns:

- Container: `overflow-hidden rounded-md border border-border`.
- Header row:
  `flex h-8 items-center gap-4 border-b border-border px-4 text-xs font-medium text-muted-foreground lg:h-10 lg:text-sm`.
- Rows:
  `flex h-12 items-center gap-4 border-b border-border px-4 last:border-b-0`.
  Clickable rows are `button`s with `hover:bg-muted/50` that open a `Dialog`
  with the details. Do not expand long content inline in the list.
- Truncate long cells with `truncate`. Commands, paths, and other code use
  `font-mono text-xs`.
- Load more pages with an outline button below the table.

### Empty and loading states

- Empty: `rounded-md border border-border p-6 text-center` containing
  `text-sm text-muted-foreground`. Say how to get the first item, not just
  that the list is empty.
- Loading:
  `<div className="flex size-full items-center justify-center"><Spinner className="size-6 text-gray-400" /></div>`.

## Presenting values

### Do not join values with separators

Do not join several values into one line with `·`, `|`, `/`, or similar
separators (for example "macOS · Online · Allow"). Show each value on its own:

- Short attributes use chips:
  `inline-flex h-6 items-center rounded-lg border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground`.
- Values that need a name use labeled fields: label above value, arranged with
  `flex flex-wrap gap-x-8 gap-y-2`. Use `whitespace-nowrap` for short values
  such as times and numbers so they do not break mid-value.
- A progress fraction such as `3 / 10` is one value, not a separator.

### Status

- Show status as an icon plus text. For tasks and executions, reuse the status
  icons in `src/assets/icons/*Status.tsx`
  (`src/page/localRuntime/ExecutionStatus.tsx` maps execution states to them).
- Connection or availability states use a chip.
- Do not invent colored dots or badge colors for status.

### Time

- Lists show relative time with `getRelatedTime` from `src/lib/time.ts` and
  show the exact time in a `Tooltip`.
- Details show the exact time formatted as `yyyy-MM-dd HH:mm:ss` with
  `date-fns` `format`.

### Code and output

- Commands and short code blocks:
  `rounded-md border border-border bg-muted/40 px-3 py-2 font-mono text-xs`.
- Output uses the same block without the background, under a small
  `text-xs text-muted-foreground` label, so it is not mistaken for the command.
- Cap heights with `max-h-*` and `overflow-auto`, and wrap with
  `whitespace-pre-wrap break-all`.

## Destructive actions

- Confirm with `AlertDialog`: the title asks the question ("Remove this
  device?"), and the description states what stops working and how to undo it.
- Cancel is `<AlertDialogCancel asChild><Button variant="outline">`.
- The action button is
  `bg-destructive text-destructive-foreground hover:bg-destructive/90` and
  shows a `Spinner` while running.
- Settings that remove a safeguard, such as running commands without approval,
  also need this confirmation.

## Copy

- Use the product name in copy: "小黑" in Chinese and "OmniBox" in English.
- Descriptions state what the feature does and its important effects in one or
  two sentences.
- Error and connection messages say what happened and what the user can do.
  Do not show raw error text such as `HTTP 401` when a known cause exists.
- Chinese copy uses full-width punctuation, including `：` after labels.
- Put strings in `src/i18n/locales/{en,zh}.json` under the feature's namespace
  with snake_case keys. Confirmations use
  `<namespace>.<action>.confirm.{title,description,button}` and statuses use
  `<namespace>.status.<key>`.
