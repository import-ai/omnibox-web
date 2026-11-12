# Button click tracking

Product controls emit `button_click` through `trackButtonClick` or the product
`Button` wrapper. The `name` property uses `module_object_action`; existing
event names remain stable when adding dimensions.

## Target dimensions

- Settings navigation includes `section`, using the destination tab key.
- Assistant actions include `app_id` and `action`: `bind`, `unbind`, or
  `cancel_bind`. Confirmation and cancellation retain the selected action.
- Assistant binding dialogs retain `app_id` on close, copy, and external-open
  events. The already-bound notice uses `action: already_bound`.
- Sidebar resource creation menus include `space_type` (`private` or `teamspace`)
  and `entry` (`space_menu` or `resource_menu`). Resource-menu actions also
  include `resource_type` and the existing `item` key.

Do not infer assistant type or settings destination from a shared event name.

## Dialog dismissal

Use the product `DialogContent` wrapper, not changes to generated UI primitives.
Set `outsideCloseTrackName` and `outsideCloseTarget` to identify the dialog.
The generated X button derives `module_target_close`; the custom X in
`ActionDialog` follows the same convention. Close events include `dismiss`
(`button` or `outside`) and `target`; `closeTrackProps` adds target dimensions.

Pass `closeDisabled` while the parent refuses dismissal during a pending save.
It blocks outside pointer/focus interactions, X, and Escape without reporting a
close. If an unsaved-change flow opens a confirmation instead of closing, omit
the close tracking name for that attempt and preserve the confirmation flow.
Caller and Radix dismissal prevention, including captcha and right-click guards,
must remain effective.

## Optional fingerprint

A fingerprint failure must not discard `button_click`: send the event without
`finger` and allow later events to retry fingerprint collection. Other event
types retain their existing delivery behavior.

The CI button-tracking step covers target attributes, disabled dismissals,
generated/custom X buttons, and fingerprint failure/recovery.
