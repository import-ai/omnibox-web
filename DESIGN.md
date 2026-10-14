# DESIGN.md

UI conventions for OmniBox Web. Follow them for new UI and when reworking
existing screens. When a convention here conflicts with older code, this file
wins; update the older code when you touch it.

> **Status.** This file was first written for a handful of settings screens.
> It now covers the whole app: foundations, the app shell, the resource tree,
> chat, the resource surface, overlays and forms, feedback, and the public
> share and auth pages. Sections are ordered from foundations outward; each
> one states rules and the reference implementation to copy.

## Where things are

| Area                                                  | Look at                                                  |
| ----------------------------------------------------- | -------------------------------------------------------- |
| Foundations: colour, type, icons, spacing, responsive | `src/index.css`, `src/components/ui/`                    |
| App shell, sidebar, resource tree                     | `src/page/sidebar/`, `src/components/ui/Sidebar.tsx`     |
| Chat                                                  | `src/page/chat/`                                         |
| Resource viewer and editor                            | `src/page/resource/`                                     |
| Copilot panel                                         | `src/page/copilot/`                                      |
| Dialogs, overlays, forms                              | `src/components/ui/`, `src/components/confirm-*`         |
| Feedback: loading, empty, error, toast                | `src/components/loading/`, `src/components/ui/Empty.tsx` |
| Public share                                          | `src/page/share/`, `src/page/shared-*`                   |
| Auth and account                                      | `src/page/user/`, `src/page/oauth/`                      |

---

# Foundations

Everything below assumes these. Read this section before styling anything.

## Colour

Use the semantic CSS custom properties, never raw Tailwind palette colours.

```tsx
<div className="bg-background text-foreground border-border" />
<span className="text-muted-foreground" />
```

- The tokens are defined in `src/index.css` under `:root` and `.dark`, and
  exposed through `@theme inline` in the same stylesheet as `background/foreground`, `card`,
  `popover`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `border`,
  `input`, `ring`, `chart-1..5`, and the `sidebar-*` family. Use them.
- Preferences exposes the official shadcn base colors independently of light,
  dark, or system appearance. OmniBox is the default; palette overrides live
  in `src/styles/colorThemes.css` and use `data-color-theme` on the root element.
  Only the seven official base colors and the OmniBox product palette are selectable; legacy accent themes resolve to Neutral.
- Raw palette colours (`text-gray-500`, `bg-neutral-200`) are drift.
  Do not add more, and replace them when you touch the file.
  The worst offenders are `bg-gray-100`, `text-neutral-400/500`, and
  `border-neutral-200/700`.
- Chat composer surfaces use `bg-chat-composer` (mapped to `--card`). Sidebar
  selection and hover use `bg-sidebar-accent`. Brand, resource-type, and status
  colors remain explicit where their meaning requires it.
- Color tokens contain complete CSS color values (OKLCH or HSL). Use `var(--border)` in CSS and
  `border-border` in classes; opacity uses `border-border/50` or `color-mix()`.
  The canonical sidebar surface token is `--sidebar`.
- OmniBox light mode uses a white `--background`; dark mode uses its dark
  background token. Never patch a page with `bg-white` to reproduce the light
  surface. The settings sidebar uses `--sidebar` and its content uses
  `--background`, exactly like the main shell.
- Keep the three main shell zones visually related: the left sidebar uses
  `bg-sidebar`, while the main window and the collapsible right sidebar use
  `bg-background`. A panel that is meant to blend into its surrounding surface
  should use that surface token directly; do not add an extra card wrapper or
  invent a near-identical background colour.
- Light and dark artwork may use different assets when the contrast requires
  it. Preserve meaningful dark-mode outlines and adjust the illustration's
  body colours together with the surrounding surface.
- The appearance selector has two independent choices: light/system/dark
  appearance and a base color. Theme names come from
  `colorThemes` and must use their localized `labelKey`; swatches must show the
  palette's representative colour. Do not couple a colour theme to light/dark
  mode.
- Do not invent coloured dots or badge colours for status. Use the status
  icons in `src/assets/icons/*Status.tsx` (see [Status](#status)).

## Dark mode

- Dark mode is a class on the root (`.dark`), not a media query. Write the
  light value and add a `dark:` variant; never read the theme in JS just to
  pick a class.
- `useTheme()` (`src/hooks/useTheme.ts`) exists for the cases where a rendered
  value must differ in JS, not for the theme toggle itself — syntax
  highlighting (`CitationMarkdown.tsx`) and the markdown preview
  (`src/components/markdown/index.tsx`), empty-state artwork
  (`InviteEmptyState.tsx`), the editor renderer
  (`src/page/resource/editor/index.tsx`), WeChat scan (`ScanForm.tsx`),
  invite phone binding (`InvitePhoneBindingDialog.tsx`), and `Toaster`
  (`src/components/ui/Toaster.tsx`). Do not use it for colours that a `dark:`
  class covers.

## Typography

- Use Tailwind's default scale. `text-sm` (14px) is the body size and the
  default for almost everything; `text-xs` is for hints, counters, and
  metadata; `text-base` and up are for page and section titles.
- Preferences offers System default, Inter, Geist, and Roboto through `--app-font` /
  `--font-sans`. Web fonts are bundled locally; Chinese glyphs use system fallbacks.
  Body text and headings use the chosen font. `font-mono` stays reserved for code, commands, and paths.
- Sizes and weights in practice:

| Element             | Class                                                                            |
| ------------------- | -------------------------------------------------------------------------------- |
| Page title          | `text-2xl font-bold` (auth pages) — see [Auth pages](#auth-pages)                |
| Dialog title        | `text-lg font-semibold leading-7`                                                |
| Section heading     | `text-lg font-semibold`, or `text-sm font-semibold lg:text-base` inside settings |
| Body                | `text-sm`                                                                        |
| Label               | `text-sm font-medium leading-5`                                                  |
| Hint / metadata     | `text-xs leading-4 text-muted-foreground`                                        |
| Code, command, path | `font-mono text-xs`                                                              |

- Below `md`, text inputs and the composer use 16px to stop iOS zooming on
  focus. Apply `text-base md:text-sm` (or the shared
  `composerTextLayoutClassName` for the composer). Do not invent a third
  spelling.

## Icons

- Use `lucide-react`. `components.json` sets `"iconLibrary": "lucide"` and 135
  files import from it.
- Use a local component in `src/assets/icons/` only for brand or resource
  marks, and `@remixicon/react` only for file-type marks inside
  `ResourceIcon.tsx`.
- Inline icons are `size-4`. Inline status marks are also `size-4` (that is
  what `ExecutionStatus` renders); a status mark standing alone as a badge is
  `size-5` (`TaskStatusBadge`); a panel spinner is `size-6`. Do not write
  `h-4 w-4` — it survives only inside shadcn primitives.
- An icon inherits its label's colour. Tint it only to signal state or
  emphasis (`text-muted-foreground`, `group-hover:text-destructive`,
  `text-blue-500` for upgrade affordances).
- Icon-only buttons always get a `Tooltip`.
- Render a resource's icon through `ResourceTypeIcon`
  (`src/components/ResourceTypeIcon.tsx`), never `ResourceIcon` directly — the
  wrapper normalises the metadata and forces a uniform `size-4` box. Direct use
  renders at 16 or 24px depending on the branch.
- `src/assets/icons/*Status.tsx` (`CompletedStatus`, `ErrorStatus`,
  `InProgressStatus`, `QueueStatus`, `CancelStatus`, `TimeoutStatus`,
  `InsufficientQuotaStatus`) are the only status marks. Select one through the
  domain's status table with a fallback —
  `src/page/localRuntime/ExecutionStatus.tsx:29-36` is the model — and render
  icon **plus** text in the normal case, never the icon alone outside a
  labelled fixed-width cell such as the task-list status column.

## Spacing, radius, and elevation

- Stack with `gap-*` on a flex container or `space-y-4` in forms; do not mix
  the two in one component.
- The current foundation is shadcn Radix Vega with semantic theme colors, Tailwind CSS 4,
  and React 19. `--radius` is `0.625rem`; small/medium/large radii use the
  official multiplier scale. Keep the primitive's default radius unless the
  product layout requires an explicit override.
- Button and Input default to 36px; small buttons are 32px and large buttons
  are 40px. Use `size="icon"` for icon actions and put `size-4` on the icon
  itself; size-specific primitive selectors otherwise choose the icon size.
- Shadows are opt-out. Most surfaces are `shadow-none`; only elevated
  overlays keep a shadow. When a component adds a shadow you did not ask for,
  pass `shadow-none` rather than editing the primitive.

## Interaction states

- Every enabled clickable control uses a hand cursor, including buttons, links,
  tabs, menu items, options, switches, and checkboxes. Disabled controls use an
  unavailable cursor and never appear clickable.
- A selected or otherwise non-actionable tab uses the normal cursor. Unselected
  tabs use the hand cursor and a transparent background; the active tab owns the
  selected surface.
- Prefer semantic interactive elements or the shared primitives over clickable
  `<div>` elements. If a custom interactive wrapper is unavoidable, add the
  same cursor and disabled-state styles explicitly.

## Responsive

- In narrow settings dialogs, place appearance previews below their title and
  description. Never squeeze explanatory text into a one-character column.

- Author at `lg` (1024px) for desktop and `sm` (640px) for the mobile ramp.
  `xl:` is effectively unused; never use `2xl:`.
- The mobile threshold is 768px, implemented in JS by `useIsMobile()`
  (`src/hooks/useMobile.ts`), not by a `md:` class. Between 640px and 768px
  `sm:` classes have applied while `useIsMobile()` still reports mobile —
  prefer the hook when behaviour (not just size) changes.
- `md:` is for the input-size switch only. `sm:` and `lg:` carry layout.
- Safe-area insets are handled once, by `#root` in `src/index.css`. Escape
  hatches use arbitrary values at the call site
  (`pt-[env(safe-area-inset-top)]`).

## Picking a primitive

Several components exist in two versions. Use these:

| Need                                 | Use                                               | Not                       |
| ------------------------------------ | ------------------------------------------------- | ------------------------- |
| Button in general                    | `@/components/Button`                             | `@/components/ui/button`  |
| Button that submits an async action  | `@/components/Button` with `loading`              | manual `Spinner`          |
| Tooltip                              | `@/components/tooltip`                            | `@/components/ui/Tooltip` |
| Input in a form                      | `@/components/ui/input`                           | `@/components/input`      |
| Input needing leading/trailing icons | `@/components/input`                              | —                         |
| Confirm a risky action               | `AlertDialog`, or a shared confirm below          | `window.confirm`          |
| Modal                                | `Dialog`                                          | `Sheet`                   |
| Help affordance (?)                  | `@/components/help-tooltip`                       | tooltip + icon            |
| Multi-select with search             | `@/components/multiple-selector`                  | raw `Command`             |
| Resource picker                      | `@/components/resourcePicker` or `resourceSelect` | hand-built tree           |
| Pagination                           | `@/components/pagination`                         | `ui/Pagination` parts     |
| Person's name and email              | `@/components/user-card`                          | hand-rolled name + email  |
| Copy to clipboard                    | `@/components/copy`                               | `navigator.clipboard`     |

- Use `@/components/Button` consistently for all buttons, including those in
  overlays. This is the team's customized Button component; use its variants
  and `loading` prop.
- The team Button delegates visuals to the current primitive and adds `loading`.
  It preserves refs and `asChild` composition. Do not duplicate primitive colors
  or disabled-state palettes in the wrapper.
- `InputGroup` composes input adornments and is used by the command input.
  The icon Input wrapper delegates to the shared Input primitive.

---

# App shell

## Frame

Every authenticated page is a `SidebarProvider` wrapping a `Sidebar` and a
`SidebarInset`. Never build the frame from raw flex divs.

```tsx
<SidebarProvider className="min-h-0 max-h-full">
  <Sidebar />
  <SidebarInset>…</SidebarInset>
</SidebarProvider>
```

- Only two routes mount a `Sidebar`: `src/page/namespace/index.tsx` and
  `src/page/share/index.tsx`. Every other route renders a bare `SidebarInset`
  under one of them.
- `SidebarProvider` is the only place `--sidebar-width` is defined, it wraps
  children in `TooltipProvider delayDuration={0}`, and it owns the
  `Cmd/Ctrl+B` toggle. Do not mount a second provider.
- Below 768px the `Sidebar` renders as a `Sheet` overlay. Callers close it
  after navigating (`setOpenMobile(false)`), because the shell does not.

## Inset and panes

Main content is a rounded pane inset from the sidebar:

```tsx
<SidebarInset className="m-[8px] h-full min-h-0 min-w-0 overflow-hidden rounded-[16px] bg-background md:h-[calc(100svh-16px)]" />
```

- On phones the inset drops the gutter: `m-0 rounded-none md:m-[8px]`. The
  share layout omits this escape, so phones get a permanent 8px gutter — copy
  the chat variant when you build a new pane.
- Content column width is table-driven, not ad hoc. Use
  `resourcePaneColumnClassName({ wide, useFullWidth, sidebarOpen, large })`
  (`src/page/resource/useResourcePaneLayout.ts`): `max-w-[680px]` normally,
  `max-w-[800px]` and `max-w-7xl` for wide modes. The editor's paired constants
  (`680` / `1280`, `src/page/resource/editor/const.ts`) must stay in sync with
  the pane widths.
- Splitting a pane (chat beside a citation, Copilot beside a resource) uses an
  animated empty spacer plus a fixed-position panel, not flex resizing. See
  `src/page/copilot/Workspace.tsx`.

## Pane headers

```tsx
<header className="flex min-h-[48px] min-w-0 shrink-0 items-center gap-2 overflow-hidden rounded-[16px] bg-background">
  <SidebarTriggerButton collapse />
  <div className="flex min-w-0 flex-1 items-center gap-1 px-3 sm:gap-2">…</div>
  <div className="ml-auto flex shrink-0 items-center gap-1 pr-3">…</div>
</header>
```

- Start with `SidebarTriggerButton collapse` (`src/components/SidebarTriggerButton.tsx`).
  It hides itself when the sidebar is already in the requested state. Do not
  hand-copy its classes or use raw `SidebarTrigger`.
- Icon-only header toggles are `Button variant="ghost" size="icon"` with
  `className="h-7 w-7 shrink-0"`, wrapped in a tooltip.
- Separate a header from its body with
  `<Separator className="bg-[#F2F2F2] dark:bg-[#303132]" />`.

## Sidebar internals

- Compose the sidebar from the `Sidebar*` primitives in
  `src/components/ui/Sidebar.tsx` (`SidebarHeader`, `SidebarContent`,
  `SidebarFooter`, `SidebarRail`). Do not hand-roll their padding.
- Width is `248..360` and is persisted, per browser, in two channels: a
  `sidebar:state` cookie and `workspace-sidebar-state` sessionStorage. Both
  clamp to the same range; the rail is deliberately `opacity-0` but still
  draggable. Do not add a resize handle.
- The resources/conversations switch is `SidebarBrowseTabs` and is the only
  `TabsList` the sidebar may contain. Its geometry comes from
  `src/index.css` (`sidebar-tabs`, `sidebar-tab`, `sidebar-tab-offset`,
  `sidebar-tab-label-inset`, `boxShadow.sidebar-tab`); the two percentages are
  complements, so change them together.
- Sidebar rows for the namespace switcher, workspace controls, resource rows,
  and conversation rows share `--sidebar-row-height` (`2.25rem`, equivalent to
  Tailwind `h-9`). Use `h-(--sidebar-row-height)` through the sidebar root
  instead of giving each row its own height.
- The namespace switcher is part of the sidebar visual review surface. Check
  its trigger, anchored menu edge, header, upgrade/settings/invite actions,
  namespace rows, tier badges, separators, create-space action, and logout
  action in both light and dark mode. The menu is `w-64` with a semantic
  `border-border`; keep its content's left and right insets aligned across all
  sections.

## Resource tree

- A row is `SidebarMenuItem` → `Collapsible` → `ContextMenuMain` →
  `SidebarMenuButton asChild` → a flex div carrying the drag ref, all inside
  `SidebarMenuSub` for children. See
  `src/page/sidebar/components/resource-tree/ResourceNodeContent.tsx`.
- Indentation is computed inline, not with classes:
  `paddingLeft: depth * RESOURCE_TREE_INDENT + nodeIndent`, with
  `RESOURCE_TREE_INDENT = 20` and `RESOURCE_TREE_ICON_OFFSET = 28` from
  `src/page/sidebar/manualDropIndicator.ts`. Import the constants; do not
  re-hardcode them.
- The selected row uses `bg-[#E2E2E6] dark:bg-[#363637]` **and** neutralises
  the primitive's own highlight with
  `data-[active=true]:bg-transparent data-[active=true]:font-normal`.
  Omitting the second half renders a different highlight from the row.
- Rename happens in place: a bare `<input className="min-w-0 flex-1
bg-transparent text-sm caret-blue-500 outline-none" />` replaces the label,
  driven by the store's `renamingId`. Enter saves, Escape reverts, blur saves
  after a delay so the opening click cannot cancel it. Do not build a rename
  dialog for tree rows.
- Drag registers `dragRef` on the inner flex div and `dropRef` on the row div —
  never both on one node — and the comparison key is `item.id`. Multi-select
  drags become `type: 'batch'`; a disallowed target sets
  `batch-drop-not-allowed` on `document.body`.
- `data-resource-tree-id`, `data-resource-depth`, `data-resource-id`, and
  `data-resource-drop-id` are a load-bearing DOM contract read back by sticky
  header math, scroll centering, and drop handling. Keep them when you refactor.
- Node menus come from `useNodeMenu(...)` rendered through `NodeContextMenu`
  (right-click) and `NodeActionsContent` (hover button). The two must show
  identical items, so add items to the hook, never to one surface. A disabled
  item stays enabled and wraps in `DisabledMenuTooltip` rather than rendering a
  disabled entry.
- The resource overflow menu is content-sized with `w-auto!` and a `min-w-36`
  floor so long labels stay on one line while short menus do not become too
  narrow. The matching context menu also keeps `min-w-36`.
- The workspace tree and the share tree are near-duplicates with divergent
  internals: different indent strategy, different element carrying the active
  state, and share has no rename and no drag. Rules in this section apply to
  the workspace tree; check
  `src/page/share/sidebar/components/ResourceNodeContent.tsx` before assuming
  they hold on a share page.

---

# Chat

## Layout

- Every chat surface is a centered `max-w-3xl` column. Never full-bleed.
- The composer sits in a pinned footer strip with the disclaimer beneath it,
  both inside the same shared element
  (`data-chat-composer` / `data-chat-disclaimer`). Do not add per-surface
  disclaimer markup.
- Do not build your own scroll container in chat. Use the chat `Scrollbar`
  (`src/page/chat/conversation/Scrollbar.tsx`), which owns stick-to-bottom, the
  floating jump-to-bottom button, keyboard-inset following, and the left-gutter
  `sideContent` slot. A plain `overflow-auto` is correct only for
  non-message lists such as the conversation history page.

## Messages

- User messages are right-aligned bubbles capped at 75% width:
  `relative flex w-fit sm:max-w-[75%] flex-col gap-2 rounded-lg px-3 py-2` with
  `ml-auto bg-secondary text-secondary-foreground dark:bg-[#303030]`.
- Assistant messages have no bubble and no max-width; they render as bare
  markdown in the left column.
- User images sit above the bubble, right-aligned, as `size-16 rounded-md
object-cover`. The composer mirrors the same sizes.
- Address a message with `id="message-<id>"` plus `scroll-mt-4`, and link to it
  as `#message-<id>`.
- Route role dispatch through `renderMessage`
  (`src/page/chat/messages/index.tsx`). Add a branch there; never fork the list.
- Collapse interleaved process messages behind a duration summary `<details>`
  and keep only the final answer visible. Grouping rules live in
  `src/page/chat/messages/messageGroups.ts`.
- Context compaction is a centered divider with `Separator`s, not a message.

## Streaming and pending state

- Waiting for the first token is a `Marker`, not a skeleton or bare spinner:

```tsx
<Marker role="status" className="mt-4">
  <MarkerIcon>
    <Spinner />
  </MarkerIcon>
  <MarkerContent className="shimmer">
    {t('chat.delivery.thinking')}
  </MarkerContent>
</Marker>
```

- An in-flight assistant turn appends a trailing spinner line, optionally with
  the TPS metric.
- The send button has four mutually exclusive states driven by `loading` /
  `waitingForAssistantDelta` / `disabled`: waiting spinner, stop button,
  disabled arrow with a tooltip reason, and primary arrow. All are
  `rounded-full size-8`.
- The `Marker` + `.shimmer` pair is the designated "waiting for the model"
  affordance. Reuse it instead of inventing a second one.

## Markdown answers

- Render assistant answers only through `CitationMarkdown`. Never use raw
  `react-markdown` in chat. Its overrides for `img`, `a`, `table`, and `code`
  are where you add new rendering behaviour, not at call sites.
- Fenced code scrolls horizontally on desktop and wraps on mobile; tables get
  an explicit overflow wrapper sized to the viewport on mobile.
- Copy and save never copy raw model text — they run `copyPreprocess(content,
citations)` so the clipboard matches the render.
- Answer-level actions are icon buttons revealed on hover, except on the last
  message, which stays visible.

## Citations

- Inline citation markers are `CitationHoverIcon` badges — a `HoverCard`
  containing a `Badge variant="secondary"` with `rounded-full`. They render
  from the markdown `a` override, nowhere else.
- The resource list is `CitationsSheet` (a right `Sheet`), opened from a
  bordered outline button on the tool message.
- Any in-chat link to a resource must use `ChatResourceLink` /
  `useChatResourceNavigation`, which preserves a real `href` while opening the
  resource in the Copilot split. Do not write a plain `<a>` for a resource.

## Tool calls and execution

- All tool calls in one turn collapse into a single `Accordion`, not one card
  each; reasoning content uses the same accordion shape.
- Show tool-call state through icon and colour — pending spinner, interrupted
  warning, success `Check text-green-600`, failed and rejected `X`/`Ban
text-red-600` — never through a text label.
- Render tool arguments as monospace chips through `ToolCallArgs`, never joined
  into a string: `bg-muted text-muted-foreground border border-border px-1.5
py-0.5 rounded text-xs font-mono`.
- An `execute_local_command` call additionally renders an execution card from
  `ToolCallExecution`. Require `ConversationExecutionsProvider` above the list.
- Approval interrupts replace the composer with `DecisionInput`; they do not
  append to it.

## Composer

- Reuse the composer shell class string verbatim rather than re-deriving it:

```tsx
'max-w-[766px] w-full mx-auto rounded-2xl p-3 border border-solid border-gray-200 bg-chat-composer dark:bg-chat-composer-dark dark:border-chat-composer-dark';
```

The `766px` dates from before the `max-w-3xl` (768px) column and is kept for
continuity; if you change it, change both `chat-input/index.tsx` and
`DecisionInput.tsx` together.

- The textarea is transparent and stacked over a rendered overlay. Apply
  `composerTextLayoutClassName` to **both** or the tokens will drift out of
  alignment.
- Render tool and resource tokens in chat text only through `InlineChatToken`.
  Its `spacer` prop is for the composer overlay; omit it for read-only message
  display.
- Every composer secondary control uses `composerControlHoverClass`
  (`src/page/chat/chat-input/composerControlClass.ts`). New controls must use
  it.
- Submission state is guarded by refs (double-send, image preparation), and the
  composer clears only after uploads resolve. Object URLs are always revoked.
- When the user's context resources are not visible as tokens, append a muted
  count line with a tooltip listing up to three, using
  `chat.messages.user_context.selected_resources`.

## Chat errors

- Backend errors arrive as `message.attrs.error_message` and render once,
  inline, in destructive text under the message — never as a toast.
- A failed send on a pending user query renders a destructive `role="alert"`
  row with a ghost retry button, not a banner.
- Tool and execution failures use status styling, not `error_message`.

## Share-only chat

A chat-only share (`useShareChatOnly()`) strips every resource affordance:
citation markers, the citations sheet trigger, resource links, markdown images,
and tool-arg link resolution. Enforce this through the hook at each of those
components; there is no central gate, so a new resource affordance must check it
too.

---

# Resource surface

## Structure

- Route the body through `Wrapper` → `AuthPage` so loading, forbidden,
  not-found, and error are handled once
  (`src/page/resource/Wrapper.tsx`).
- Pick the body by feature flag, not by route: the view route renders `Render`
  and the edit route renders `Editor`, and both switch on `editor_v2` through
  `selectUseOmniboxEditor`. New resource-surface code must tolerate both paths.
  `props.forceOmniboxEditor` exists so embedded previews (Copilot) can opt in
  regardless of the flag.
- There are no per-type renderers. `ResourceType` is
  `doc | file | link | folder | smart_folder | rss_folder | rss_item`, and a
  `file` always renders its content as markdown. Type affects the icon and the
  download action only.
- Treat `folder | smart_folder | rss_folder` identically through
  `isFolderLikeResourceType`, never an inline triple comparison.
- Read `resource.read_only` before offering any mutate action — it means the
  backend owns the resource.

## Header and title

- The header is the standard 48px pane header (see
  [Pane headers](#pane-headers)): breadcrumb left, actions right.
- Page title uses `resource-search-title mb-4 min-w-0 max-w-full break-all
text-[34px] font-bold` and highlights the search term by splitting on
  `splitSearchText` and wrapping matches in `<mark className="search-query-mark">`.
  Do not use a plain `h1`.
- The editor title is a `ResourceTitleTextarea` with
  `t('resource.title_placeholder')`.
- All secondary actions live in one `DropdownMenu` behind a ghost
  `MoreHorizontal` button with `className="cursor-pointer gap-2"` items and
  `size-4` icons. While an item's own action is in flight, swap its icon for a
  `Spinner` and disable it rather than removing it.
- Gate action clusters with `PermissionWrapper`, not with conditionals inside
  the item list.

## Attributes and tags

- Every attribute row composes `ATTRIBUTE_STYLES`
  (`src/components/attributes/constants.ts`). Do not hand-roll the
  icon/label/value trio, and keep the `space-y-2 mb-6 text-sm` block wrapper.
- A URL attribute is the one exception: a `grid-cols-[auto,minmax(0,1fr)]` pair
  with a truncating external anchor.
- Read-only resources show metadata without edit affordances and omit the tag
  widget entirely.
- Tags are `Badge variant="outline"` chips with
  `border-neutral-300 text-neutral-500 font-normal rounded-[8px] px-[8px]`,
  collapsing to three plus a `+N` pill that expands in place. Entry is a
  `MultipleSelector` with `creatable`, capped at 10 tags of 20 characters.

## Attachments and files

- There is no page-level attachment preview. Images preview only inside comment
  bodies, through a button opening a `Dialog`; detect them with
  `mimetype.startsWith('image/')`.
- Identify file attachments by `attrs.original_name` and `attrs.mimetype`, and
  make the file attribute row itself the download affordance. Do not add a
  separate download button.
- There is no "unsupported file type" state; unknown types fall back to a
  generic icon.
- Parse failure surfaces through the task list, not the body. Retry is a
  toolbar item, shown only for `file` and `link` with retryable tasks.
- A resource that fails to load shows one centered muted line
  (`flex min-h-64 items-center justify-center text-sm text-muted-foreground`),
  not an empty page.

## Upload

- Upload through a hidden file input plus `openFilePicker`, not a visible
  `<input type="file">`.
- Show progress inside the menu item's own label as `done/total`. There is no
  progress-bar component for operations, and none should be added; the only
  bar in the app is the storage breakdown in settings.
- Image upload inside the editor posts to the resource's attachments endpoint
  and returns a `linkBase`-relative URL.

## Selection and bulk actions

- Multi-select state lives in the sidebar store, toggled from the tree toolbar;
  every batch surface reads `selectedIds` from there.
- In selection mode each row shows a `Checkbox` before the icon and shifts to
  `pl-2`.
- Bulk actions are icon-only toolbar buttons with tooltips, separated from the
  exit control by a vertical `Separator className="h-4 bg-[#8F959E]"`.
- Batch delete, move, and create each have a dedicated confirm dialog driven by
  store `dialogs.*` flags, not local state.
- Act only on top-level selected ids; drop children of a selected folder.
- An unsupported batch operation degrades to a disabled button with an
  explanatory tooltip, not a missing button.

## Trash

Trash shares nothing structural with the resource surfaces — it reuses style
tokens only. It is a sidebar popover (`w-80`, computed placement) whose rows
are hover-revealed action rows. Its empty state is an icon plus muted text at
`opacity-50`.

---

# Copilot panel

- Resolve panel presentation from viewport width in one pure function,
  `getCopilotPanelLayout`. Never hard-code panel widths at a call site.
  Modes: below 768px `fullscreen`, below 1024px `overlay` (max 380), otherwise
  `split` (32% of the _workspace_, clamped 340–380).
- `COPILOT_PANEL_MAX_WIDTH = 380` is shared with the chat citation split.
- The panel is fixed-position and only `transform` animates. Reserve space with
  an empty flex spacer, never by shrinking the panel, and freeze the width while
  closing so text cannot reflow mid-animation.
- Use `COPILOT_PANEL_TRANSITION_MS` for the duration.
- Mark an offscreen panel `inert` and `aria-hidden` rather than unmounting it.
- `role="dialog"` + `aria-modal` in `fullscreen`/`overlay`; `role="complementary"`
  in `split`. That same condition drives Esc-to-close, scroll lock, focus trap,
  and focus restore.
- The panel opens from the header toggle (`CopilotToggleButton`, `h-7 w-7`) or
  from clicking a citation badge in chat. There is no text-selection bubble —
  selection feeds the comments composer, which is a different feature.
- Persist the open flag per namespace in sessionStorage; never persist the
  transient `pendingExpandFromResource`.
- Host panel chat with `compact` so shared chat chrome drops full-page-only
  affordances.

---

# Overlays and dialogs

## Choosing an overlay

| Job                                                                                      | Component                                    |
| ---------------------------------------------------------------------------------------- | -------------------------------------------- |
| Any modal content: settings, forms, confirms, detail, preview, pickers                   | `Dialog`                                     |
| A side panel that stays open beside page content                                         | `Sheet`                                      |
| Get an answer, not collect input                                                         | `AlertDialog`                                |
| Anchored panel that is neither menu nor preview: date picker, inline rename, share panel | `Popover`                                    |
| Action list                                                                              | `DropdownMenu`                               |
| Right-click on a tree row                                                                | `ContextMenu`                                |
| Rich read-only preview of content already visible inline                                 | `HoverCard`                                  |
| Confirm a risky action                                                                   | `AlertDialog`, or a shared confirm component |

- `Dialog` is the house modal (33 call sites). `Sheet` has two
  (`CitationsSheet`, and the mobile sidebar offcanvas inside
  `src/components/ui/Sidebar.tsx`); do not reach for it because a design
  "feels" like a drawer.
- `Popover`'s default `w-72 p-4` is never accepted as-is — all eight call sites
  override it. For inline editing use `align="start" className="w-72 space-y-3
p-3"`.
- `AlertDialogContent` has no close button. `AlertDialogCancel` already carries
  the outline variant and `mt-2 sm:mt-0`; do not add either by hand.
- Use the `ContextMenuContent` wrapper from `@/components/ContextMenuContent`,
  never the raw primitive — the wrapper keeps the menu open on right-click and
  handles macOS Control+click.

## Sizing

- Never accept the default `max-w-lg`. Pick a tier and always pair a percentage
  width with an `sm:` breakpoint width so phones get `w-[90%]`:

| Tier          | Class                                                  | Use                               |
| ------------- | ------------------------------------------------------ | --------------------------------- |
| Wide form     | `w-[90%] max-w-7xl p-4 sm:w-1/2 sm:p-6`                | medium dialogs, the house default |
| Small confirm | `w-[85%] max-w-sm`                                     | confirms, delete                  |
| Medium        | `max-w-md`                                             | invite, typo-to-confirm           |
| Detail        | `max-w-2xl`                                            | records, execution detail         |
| Picker        | `w-[480px] max-w-[90%] bg-popover dark:bg-neutral-900` | resource pickers, move            |

- Suppress the built-in close button with `[&>button]:hidden` when the dialog
  provides its own header actions.
- When a dialog has no visible title, still render one inside
  `VisuallyHidden`.

## Header, body, footer

- Header is `DialogHeader` + `DialogTitle`; `DialogDescription` is optional.
  Most dialogs have no footer component — a hand-rolled
  `flex justify-end gap-2` is the norm.
- `DialogFooter` defaults to `flex flex-col-reverse sm:flex-row
sm:justify-end sm:space-x-2`. That `flex-col-reverse` is why **Cancel must be
  written first in JSX**: it renders above on mobile and left on desktop.
- Never use a sticky or fixed footer, and never add a `border-t` above it.
  Scroll the body instead (`max-h-[65vh] overflow-y-auto`).
- Body padding is `p-6`, or `p-4 sm:p-6`, or `p-0` for chrome-style shells.
- Cancel is always `variant="outline"`, using the shared `cancel-btn-outline`
  class or `<AlertDialogCancel asChild><Button variant="outline">`.
- The confirm action is `variant="default"`, or destructive as either a filled
  button (`bg-destructive text-destructive-foreground hover:bg-destructive/90`)
  or, for API-key and app removal, an outlined one. Prefer filled.

## Shared confirm components

Use these before composing an `AlertDialog`:

- `src/components/ConfirmDialog.tsx` — the generic confirm
  (`variant="destructive"` supported).
- `src/components/confirm-delete-dialog/index.tsx` — delete with an undo toast.
- `src/components/confirm-input-dialog/index.tsx` — type-to-confirm, for
  irreversible actions.
- `src/components/FolderNameDialog.tsx` — name entry; Enter submits (guarded by
  `!e.nativeEvent.isComposing`) and close is blocked while submitting.
- `src/components/popconfirm/index.tsx` is legacy: hardcoded `bg-red-500` and
  untranslated English defaults. Do not use it for new work.

- Vega dialogs default to `sm:max-w-md`. A wider feature dialog must override
  the same breakpoint (for example `sm:max-w-2xl`). Use `showCloseButton={false}`
  when the feature renders its own close control. Dialog footers include their
  own padding and muted surface; avoid adding a second footer background.

## Forms

- Wrap every field in `FormItem` and stack fields with `space-y-4 px-px`; label
  above the control, one column.
- Use `react-hook-form` with `zodResolver`, and render errors through
  `<FormMessage />`. Never hand-write `<p className="text-red-...">`.
- Zod messages are **i18n keys**, not sentences — `FormMessage` translates them
  with `t(fieldError.message)`.
- Error text is `text-sm font-medium text-destructive`, and `FormLabel`
  turns destructive while errored. Empty error slots collapse rather than
  reserving space.
- Do not add a required marker. There is no asterisk, no `aria-required`, and
  no `required` attribute anywhere — requiredness is communicated only by the
  validation message on submit.
- Disable individual fields with `disabled`; never wrap a form in
  `<fieldset disabled>`.
- `readOnly` is for display-only text boxes such as share URLs. A domain
  `readOnly` prop that means "the backend owns this resource" is a different
  thing — do not conflate them.
- Submit buttons use `loading` from `@/components/Button`, not a hand-placed
  `Spinner`. Compose dialog actions with `AlertDialogAction asChild` and this
  Button component.
- `FormControl` forwards invalid state; current inputs, textareas, selects, and
  input groups provide the destructive border and focus ring automatically.
- `Form` remains a local React Hook Form adapter because the current registry
  no longer ships it. Preserve its translated error messages during upgrades.

## Pickers

- Pick one of a few values: `DropdownMenu` with an outline `Button` trigger, a
  `Check` on the selected item, and content matched to the trigger width. This
  is the settings pattern; see `src/page/settings/tabs/basic/Theme.tsx`.
- `Select` is for in-form field choices, with a 36px default trigger matching `Input`. Add `w-full` for form rows;
  the primitive defaults to content width.
- Command palette: `CommandDialog` with a localized title and an explicit
  `Command` child. Remote search uses `shouldFilter={false}`.
- Async or creatable multi-select: `MultipleSelector`.
- Resource pickers: `resourcePicker/` or `resourceSelect/`, never a hand-built
  tree. `resourceSelect` must match its trigger's width (it mirrors it with a
  `ResizeObserver`).

## Tooltip

- Import from `@/components/tooltip`, the product entry point for the shared
  tooltip primitive. Its content includes an arrow by default.
- There is no root `TooltipProvider`. Wrap the region: once around a whole list,
  individually for a standalone icon button.
- Use `delayDuration={0}` for dense toolbars and in-flow affordances.
- Resource-name tooltips are noninteractive. Use `disableHoverableContent` so
  moving to the adjacent action menu dismisses the name tooltip.
- Tooltips are required on icon-only buttons.

---

# Feedback and async state

## Loading

- A page or panel whose whole content is pending uses `Loading`
  (`src/components/loading/index.tsx`). Seven sites hand-roll the same markup
  instead of importing it — import it.
- `Skeleton` only when the pending layout's shape is known and stable. It has
  two product uses (`InviteReferralContent.tsx`, `CopilotView.tsx`) and is the
  newest primitive; do not reach for it by default.
- A bounded slot uses a bare `Spinner` (`size-6 text-muted-foreground` for panels,
  `size-4` inline).
- A single tree row uses inline text plus a `size-4` spinner:
  `flex items-center gap-2 py-1.5 text-sm text-muted-foreground`.
- A button that triggers an async write is `disabled` while in flight and shows
  a `Spinner`. Prefer the `loading` prop so the two stay in sync.

## Empty states

- Every list renders an explicit empty state that says how to get the first
  item. Do not leave a pending or empty region blank.
- For full-page or panel-level empties use the `Empty` family
  (`Empty`, `EmptyHeader`, `EmptyMedia variant="icon"`, `EmptyTitle`,
  `EmptyDescription`, `EmptyContent`). It defaults to `border-dashed` with no
  border colour, so pass one.
- For in-panel lists such as settings, the established pattern is the simpler
  `rounded-md border border-border p-6 text-center` containing
  `text-sm text-muted-foreground`. Most existing empty states use this; it is
  acceptable, but prefer `Empty` for new full-page states.
- A compact list such as the sidebar uses a bare muted paragraph.

## Errors

- Let the `http` interceptor own error toasts. Pass `mute: true` (or
  `muteCodes`) only when you surface the error yourself, and never repeat the
  same error a second time.
- Use `Alert` for a persistent state the user must understand, `AlertDialog` to
  confirm a risky action, and a toast for the transient result of an action.
  Do not toast something the user must act on later.
- Do not render bare red text. Use `Alert variant="destructive"` for a
  page-level problem and `role="alert"` plus `text-destructive` for a
  form- or message-level one.
- The "no raw error text" rule is only partly true today: `src/lib/request.ts`
  prefers the backend's `data.message` over the localized fallback, and a few
  call sites do the same. New code must not add another — map known causes to
  copy and fall back to a localized generic message.
- Retry affordances, in order of preference: an inline ghost
  `<Button variant="ghost" size="sm">{t('common.retry')}</Button>` under the
  list, or a centered muted message with an outline button for a whole panel.
- There is exactly one error boundary, the router's `errorElement`
  (`src/layout/ErrorPage.tsx`). Do not add a second; do fix its palette and raw
  `error.message` rendering when you touch it.

## Toasts

- `toast.success` for completed writes, `toast.error` for failures the user
  caused, `toast.warning` sparingly. `toast.info` and `toast.promise` have no
  call sites — do not introduce them.
- Always pin `{ position: 'bottom-right' }`. Roughly 98 sites do; the rest
  drift.
- Use `showActionToast` (`src/components/sonner/`) when the toast carries an
  undo. It exists to keep undo toasts consistent and currently has one caller —
  prefer it over hand-rolling `action: { label, onClick }`.
- Inside the settings dialog, use `useSettingsToast()`. It duplicates Sonner's
  look with its own palette to stay inside the dialog's stacking context. Do
  not mix the two systems in one file.

## Optimistic updates

- Apply the mutation to the store first, snapshot the prior state, and roll
  back from the snapshot on failure. `src/page/sidebar/store/actions/batch.ts`
  is the one real implementation — follow it rather than waiting for the server
  round-trip to update the tree.
- User-visible undo is a compensating action (an undo toast), not a snapshot.

## Long operations

- Show a `done/total` counter next to a spinner, throttled to about one update
  per 100ms. Do not show a percentage bar.
- Long server-side work is polled and represented as a status chip with a
  trailing spinner, not as progress.
- Polling uses the shared resettable helper rather than a hand-rolled
  `setInterval`.

---

# Public share and auth

## Share shell

- Two tiers: the password gate, error states, and the loading fallback sit
  outside the sidebar shell and return early; only a loaded share mounts
  `ShareLayout` and the sidebar.
- The password gate is centered (`flex justify-center p-10`) with a
  `w-[400px]` column and no sidebar or card, and follows auth-form conventions
  (`space-y-4`, `FormMessage` for the failure, full-width submit).
- An unknown share renders the shared `Empty` block with the delete icon; a
  404 inside a share renders `DeletedResourcePage`. A permissions failure is
  never shown publicly.
- Status codes drive the public error UI: 401 redirects to login with a
  `redirect` param, 403 is the password gate, 404 is not-found, anything else
  uses the server message or `request.unknown_error`.
- A chat-only share keeps the sidebar but drops the resource tree, and every
  entry path redirects to `/s/:id/chat`.

## What public pages may not use

- No `AuthPage`, `UnauthorizedPage`, or workspace error pages.
- No workspace sidebar store or tree — share owns its own store.
- No workspace data roots: `SettingModal`, `SearchMenu`,
  `ConversationSearchDialog`, `FooterSidebar`, `SidebarBrowseTabs`, `Switcher`.
- No authenticated chat header, credits, recommended questions, or feature
  cards.
- Write actions must be expressed as share-scoped affordances: node menus offer
  only add-to-context, and share actions only copy, download, and wide toggle.
- `Page` may be reused publicly **only** with `editPage={false}`, `readOnly`,
  and both share-scoped prefixes (`apiPrefix`, `navigationPrefix`) set.
  Omitting `apiPrefix` makes `Page` call the authenticated endpoint — a hard
  401 for a visitor.

## Auth pages

- Every `/user/**` and `/oauth/**` page wraps its content in `WrapperPage`
  (`src/page/user/WrapperPage.tsx`). Do not hand-roll a centered container; the
  shell owns vertical centering, keyboard-inset handling, the logo, and the
  language and theme toggles.
- Login and registration follow shadcn `login-02`: on large screens they use a
  two-column shell with the form in a `max-w-xs` left column and a visual panel
  on the right; the visual panel is hidden on narrow screens. Other auth pages
  keep the centered card layout. Use `bg-background` for the form surface and
  separator labels, and `bg-muted` for the auth visual panel. Do not hard-code
  light or dark surface colors.
- Compose phone fields with `InputGroup` and `InputGroupInput` so the country
  prefix and input share one background, border, and outer radius.
- `useCard` defaults to true. A page that is a spinner or a message passes
  `useCard={false}`; a page with fields keeps the card.
- Language and theme toggles belong to the shell, top-right, never repeated in
  a page body.
- The logo links to the localized marketing home and sits in a primary tile.
- The legal footer is passed as `extra={<MetaPage />}`, and the app-download QR
  is opt-in per page.
- Login and registration headings use `text-xl font-medium` with no extra
  top padding inside the card. Other auth headings use `text-2xl font-bold`.
  Pair headings with a `text-balance text-sm
text-muted-foreground` description. A verification or status screen inside a
  card uses the top-aligned variant (`flex flex-col items-center gap-6 pt-10`)
  instead of the vertically centered one.
- Field errors go through `FormMessage`; submit buttons are full width with
  `disabled:opacity-60` and the `loading` prop.
- Inputs use `text-base md:text-sm` to defeat iOS zoom.
- Third-party providers render as `Button variant="outline"` with
  `className="w-full"`, in the fixed order contact toggle, WeChat, Google,
  Apple, each behind the capability flags from `useAuthConfig`.
- Cross-links between login, register, and OTP preserve the invite code and
  redirect through `buildUrl(..., withInviteCode({ ..., redirect }))`.
- The OAuth consent screen is card-less, centered, and shows the authorizing
  account as one bordered row. Non-desktop clients never see it; they redirect
  or show a failure line.

---

# Presenting values

## Settings pages

Settings tabs render inside the settings dialog's content area
(`src/page/settings/SettingWrapper.tsx`). There is no shared page component:
compose each tab from the patterns below with the listed classes so every tab
reads the same. Desktop tabs added through `settingsExtensions` follow the same
rules.

Reference implementations:

- `src/page/settings/tabs/content/AutoTag.tsx` - canonical setting option row
  (AI smart tag extraction): optional icon, title, description, and right-side control
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

Every setting option across all settings tabs follows the AI smart tag
extraction row in `src/page/settings/tabs/content/AutoTag.tsx`: an optional
icon, a title with a description below it, and the corresponding control or
action on the right. The title and description are required. The icon is
optional, and options with a current value or status may display it next to
the title. Apply this structure to switches, selectors, and action buttons alike.

```tsx
<div className="grid w-full grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-2 px-2 py-2">
  <Icon className="size-4 text-muted-foreground" />
  <span className="min-w-0">
    <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span className="text-sm font-medium leading-5 text-foreground">
        {title}
      </span>
      {currentValue != null && (
        <span className="min-w-0 break-words text-sm font-normal leading-5 text-muted-foreground">
          {currentValue}
        </span>
      )}
    </span>
    <span className="block whitespace-normal text-xs leading-4 text-muted-foreground">
      {description}
    </span>
  </span>
  <Switch className="shrink-0" />
</div>
```

- Stack rows with `flex flex-col gap-2`.
- With an icon, use the three-column grid above. Without an icon, omit the
  icon element and use `grid-cols-[minmax(0,1fr)_auto]`; do not leave an empty
  icon column.
- Keep the title and description together in the middle text block. Use
  `text-sm font-medium leading-5 text-foreground` for the title and
  `text-xs leading-4 text-muted-foreground` for the description.
- The control is always on the right and vertically centered against the text
  block. Keep it `shrink-0`; do not put a switch before its title.
- Use the optional value/status position for values such as a username or bound
  email address, or states such as "Not bound". Keep it next to the title with
  spacing, without punctuation separators or a mandatory badge. Use
  `text-sm font-normal leading-5 text-muted-foreground` so the title remains
  prominent. Let long values wrap on narrow screens without squeezing the action.
- The description explains the setting's purpose or effect, rather than
  repeating its title or current value. Keep the value/status separate from
  the description and update it when the setting changes.
- Do not duplicate a value already clearly shown by the control, such as the
  selected option in a Select or the on/off state of a Switch.
- Let descriptions wrap and rows grow with their content; do not truncate the
  description or force a fixed row height. Keep the row on the settings content
  background without adding a separate card or border around each option.
- When a row depends on another setting that is off, add `opacity-50` to the
  row and disable its control. Keep the row visible so users can see what they
  would enable.
- Read-only options use the same value/status position and omit the right-side
  action when none is available.

### Controls

| Need                     | Use                                                                 | Do not use         |
| ------------------------ | ------------------------------------------------------------------- | ------------------ |
| On/off                   | `Switch` from `@/components/ui/Switch`                              | Native checkbox    |
| Pick one of a few values | `Select` with `SelectTrigger` and `SelectContent position="popper"` | Native `<select>`  |
| Text entry               | `Input` and `Label`                                                 | Unstyled `<input>` |
| Confirm a risky action   | `AlertDialog`                                                       | `window.confirm`   |
| Page-level problem       | `Alert variant="destructive"`                                       | Bare red text      |

- Single-value settings use `Select` with its default 36px height, `rounded-md`,
  and visible `border-input`. Open options below the trigger with
  `position="popper"`; use `DropdownMenu` for actions, not value selection.
- Settings row actions use `SettingPageButton` from
  `@/components/omnibox/SettingPageButton`. It inherits `@/components/ui/button`
  at 30px height with 12px text and weight 500, and shares one
  width, sized by the delete-account label. Binding uses `default`, changing
  an existing value uses `outline`, and destructive actions use `destructive`.
  Do not override height, font size, radius, or state colors per action.
  Dialog submit and cancel buttons stay on `@/components/Button`.
- Icon-only actions use `Button` with a `Tooltip` and a
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
- Prefer this flex pattern to `@/components/ui/Table`, which has only three
  callers, unless you genuinely need column semantics.

### Empty and loading states

- Empty: `rounded-md border border-border p-6 text-center` containing
  `text-sm text-muted-foreground`. Say how to get the first item, not just
  that the list is empty.
- Loading:
  `<div className="flex size-full items-center justify-center"><Spinner className="size-6 text-muted-foreground" /></div>`.

## Do not join values with separators

Do not join several values into one line with `·`, `|`, `/`, or similar
separators (for example "macOS · Online · Allow"). Show each value on its own:

- Short attributes use chips:
  `inline-flex h-6 items-center rounded-lg border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground`.
- Values that need a name use labeled fields: label above value, arranged with
  `flex flex-wrap gap-x-8 gap-y-2`. Use `whitespace-nowrap` for short values
  such as times and numbers so they do not break mid-value.
- A progress fraction such as `3 / 10` is one value, not a separator.

## Status

- Show status as an icon plus text. For tasks and executions, reuse the status
  icons in `src/assets/icons/*Status.tsx`
  (`src/page/localRuntime/ExecutionStatus.tsx` maps execution states to them).
  A fixed-width cell whose column is already labelled — the task-list status
  column, `TaskStatusBadge` inside `TaskList.tsx` — may render the icon alone.
- Connection or availability states use a chip.
- Do not invent colored dots or badge colors for status. The one established
  exception is the notification unread dot (`size-2 rounded-full bg-red-500`)
  and its sidebar unread-count badge — that is a count, not a status.
- `Badge` is for counts and inline labels, not status. Citation numbers use
  `variant="secondary"`; tags use `variant="outline"`.

## Time

- Lists show relative time with `getRelatedTime` from `src/lib/time.ts` and
  show the exact time in a `Tooltip`.
- Details show the exact time formatted as `yyyy-MM-dd HH:mm:ss` with
  `date-fns` `format`, inside a `<time dateTime=...>` element.
- The notification list is the one documented exception: it formats with
  `formatDistanceToNow` and a locale picked from `i18n.language`, and carries
  no exact-time tooltip.

## Code and output

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
- When the action is reversible, offer undo in the follow-up toast through
  `showActionToast` rather than leaving the user without a way back.

## Copy

- Use the product name in copy: "小黑" in Chinese and "OmniBox" in English.
- Descriptions state what the feature does and its important effects in one or
  two sentences.
- Error and connection messages say what happened and what the user can do.
  Do not show raw error text such as `HTTP 401` when a known cause exists.
- Chinese copy uses full-width punctuation, including `：` after labels. Use the Chinese ellipsis `……` in loading and progress strings.
- Put strings in `src/i18n/locales/{en,zh}.json` under the feature's namespace
  with snake_case keys. Confirmations use
  `<namespace>.<action>.confirm.{title,description,button}` and statuses use
  `<namespace>.status.<key>`.

# Internationalisation

- There is exactly one i18next namespace (`translation`). Keys are flat dotted
  paths starting with a snake_case feature namespace — `t('local_runtime.status.succeeded')`.
  Never pass a namespace argument to `useTranslation()`.
- A handful of one-off verbs and statuses live as flat single-string root keys
  (`cancel`, `ok`, `delete`, `loading`, `load_more`). That is the established
  pattern for strings with no feature home, not an oversight.
- Nested objects group a feature's strings. There is no per-feature file and no
  lazy loading.
- English and Chinese must stay parallel. `zh.json` currently has one key
  `en.json` lacks (`form.phone_or_username`) — fix divergence rather than
  adding to it.
- Interpolation is `{{var}}` with `escapeValue: false`. Plurals exist but are
  nearly unused (`_one` / `_other`); do not assume they are wired up.
- React components read `t` from `useTranslation()`. Outside React, import the
  singleton from `i18next` (for a `t` that must re-read the language) or
  `import { t } from 'i18next'` for fixed strings. Do not resolve strings at
  module scope when the caller's language can change.
- Statuses use sentence case in English (`Awaiting approval`). `applications.status.*`
  still uses Title Case — follow sentence case for new work.
- A status label derived from a raw backend value —
  `t(\`local_runtime.status.${status}\`)`— renders the literal key when the
value is unmapped. Add the key, and add a guard test like`src/i18n/toolCallLabels.test.ts` for any new derived-label family.
