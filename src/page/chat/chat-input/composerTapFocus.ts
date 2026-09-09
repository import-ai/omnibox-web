const IME_FOCUS_PROBE_STYLE =
  'position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;overflow:hidden;pointer-events:none;border:0;padding:0;margin:0';

/**
 * Android hides the keyboard with the back or collapse key without blurring the
 * input, and tapping a still-focused input does not bring the keyboard back.
 *
 * The first tap is left to the browser: scripted focus({ preventScroll }) is
 * enough for WeChat to cancel the IME. Only an already-focused field with no
 * keyboard on screen needs a focus transfer.
 */
export function refocusComposerForIme(textarea: HTMLTextAreaElement): void {
  const doc = textarea.ownerDocument;
  const probe = doc.createElement('button');
  probe.type = 'button';
  probe.tabIndex = -1;
  probe.setAttribute('aria-hidden', 'true');
  probe.style.cssText = IME_FOCUS_PROBE_STYLE;
  doc.body.appendChild(probe);
  probe.focus({ preventScroll: true });
  textarea.focus({ preventScroll: true });
  probe.remove();
}

export function focusComposerOnTap(
  textarea: HTMLTextAreaElement | null,
  keyboardOccluding: boolean
): void {
  if (!textarea) {
    return;
  }
  if (textarea.ownerDocument.activeElement !== textarea) {
    return;
  }
  if (keyboardOccluding) {
    return;
  }
  refocusComposerForIme(textarea);
}
