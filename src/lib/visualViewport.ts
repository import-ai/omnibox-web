export type VisualViewportLike = Pick<VisualViewport, 'height' | 'offsetTop'>;

export type VisualViewportMetrics = {
  height: number;
  offsetTop: number;
  keyboardOpen: boolean;
};

export type VisualViewportTarget = {
  document: Document;
  innerHeight: number;
  scrollX: number;
  scrollY: number;
  visualViewport?: VisualViewportLike | null;
  addEventListener: Window['addEventListener'];
  removeEventListener: Window['removeEventListener'];
  scrollTo: (x: number, y: number) => void;
};

export type BindVisualViewportOptions = {
  userAgent?: string;
};

const KEYBOARD_OPEN_THRESHOLD_PX = 120;
const KEYBOARD_CLOSE_THRESHOLD_PX = 16;

export const KEYBOARD_DISMISS_DELAY_MS = 50;
export const KEYBOARD_DISMISS_MS = 300;
export const KEYBOARD_OPEN_SETTLED_MS = 120;
export const KEYBOARD_OPEN_DELAY_MS = 64;
export const KEYBOARD_OPEN_REBOUND_PX = 16;
export const KEYBOARD_CLOSE_CONFIRM_MS = 100;
export const KEYBOARD_OPEN_WATCH_MS = 1000;
export const KEYBOARD_INSET_CHANGE_EVENT = 'omnibox:keyboard-inset-change';

export function isAppleMobileUserAgent(userAgent: string): boolean {
  return /iPhone|iPad|iPod/i.test(userAgent);
}

/**
 * iOS Safari reports a short visual viewport on focus, restores it, then
 * shrinks again for the keyboard. Chasing that bounce is the up-down-up
 * hitch. Android and WeChat still follow as soon as the field is focused.
 */
export function shouldFollowViewportOnFocus(params: {
  appleMobile: boolean;
  layoutKeyboardOpen: boolean;
}): boolean {
  return !params.appleMobile || params.layoutKeyboardOpen;
}

/**
 * Safari reports an undershoot (vv 351) then the settled keyboard (395) in
 * the same opening. Hold the rest shell until that rebound, or until a short
 * delay elapses if the undershoot never grows. Skipping only one frame is not
 * enough: the 16ms open-watch still sees 351 and paints it.
 */
export function shouldDelaySafariOpeningPaint(params: {
  appleMobile: boolean;
  layoutKeyboardOpen: boolean;
  keyboardAlreadyOpen: boolean;
  reportedOpen: boolean;
  delayElapsed: boolean;
  reportedHeight: number;
  openingMinHeight: number;
}): boolean {
  if (
    !params.appleMobile ||
    params.layoutKeyboardOpen ||
    params.keyboardAlreadyOpen ||
    !params.reportedOpen ||
    params.delayElapsed
  ) {
    return false;
  }
  if (
    params.openingMinHeight > 0 &&
    params.reportedHeight >= params.openingMinHeight + KEYBOARD_OPEN_REBOUND_PX
  ) {
    return false;
  }
  return true;
}

export function notifyKeyboardInsetChange(
  target: Pick<Document, 'dispatchEvent'>,
  metrics: VisualViewportMetrics
): void {
  target.dispatchEvent(
    new CustomEvent(KEYBOARD_INSET_CHANGE_EVENT, { detail: metrics })
  );
}

export function resolveKeyboardInset(
  innerHeight: number,
  visualViewportHeight: number
): number {
  return Math.max(0, Math.round(innerHeight - visualViewportHeight));
}

/**
 * Size the app to the part of the screen that is actually visible.
 * Safari/Chrome shrink `visualViewport`; WeChat shrinks `innerHeight`.
 * Chrome with an overlaying keyboard may instead pan (`offsetTop`) while
 * leaving `visualViewport.height` full — that pan is the keyboard.
 */
export function resolveVisibleViewportHeight(
  innerHeight: number,
  visualViewportHeight: number | null | undefined,
  offsetTop = 0
): number {
  const visualHeight = visualViewportHeight || innerHeight;
  const fromVisual = Math.min(innerHeight, visualHeight);
  const visualOcclusion = Math.max(0, innerHeight - fromVisual);
  if (visualOcclusion > KEYBOARD_CLOSE_THRESHOLD_PX) {
    return Math.max(0, Math.round(fromVisual));
  }
  const panOcclusion = Math.max(0, Math.round(offsetTop));
  return Math.max(
    0,
    Math.round(Math.min(fromVisual, innerHeight - panOcclusion))
  );
}

export function resolveKeyboardOcclusion(
  innerHeight: number,
  visualViewportHeight: number,
  offsetTop = 0
): number {
  const visualOcclusion = resolveKeyboardInset(
    innerHeight,
    visualViewportHeight
  );
  if (visualOcclusion > KEYBOARD_CLOSE_THRESHOLD_PX) {
    return visualOcclusion;
  }
  return Math.max(visualOcclusion, Math.max(0, Math.round(offsetTop)));
}

export function resolveRestingViewportHeight(
  innerHeight: number,
  visualViewportHeight: number | null | undefined,
  layoutBaseline = 0
): number {
  const visualHeight = visualViewportHeight || innerHeight;
  return Math.max(
    0,
    Math.round(Math.max(innerHeight, visualHeight, layoutBaseline))
  );
}

/**
 * Safari and Chrome shrink only the visual viewport for the keyboard, but
 * in-app WebViews such as WeChat's shrink the layout viewport instead, which
 * makes `innerHeight` itself drop. Comparing against the tallest layout
 * viewport seen so far is the only way to see that keyboard.
 */
let layoutViewportBaseline = 0;

export function noteLayoutViewportBaseline(innerHeight: number): number {
  layoutViewportBaseline = Math.max(layoutViewportBaseline, innerHeight);
  return layoutViewportBaseline;
}

export function resetLayoutViewportBaseline(innerHeight: number): void {
  layoutViewportBaseline = innerHeight;
}

export function resolveLayoutKeyboardOcclusion(
  baselineInnerHeight: number,
  innerHeight: number,
  visualViewportHeight?: number | null
): number {
  const layoutOcclusion = Math.max(
    0,
    Math.round(baselineInnerHeight - innerHeight)
  );
  if (layoutOcclusion <= KEYBOARD_CLOSE_THRESHOLD_PX) {
    return 0;
  }
  // Safari briefly lowers innerHeight together with visualViewport. WeChat
  // leaves visualViewport tall and only shrinks the layout.
  if (visualViewportHeight != null) {
    const visualOcclusion = Math.max(
      0,
      Math.round(baselineInnerHeight - visualViewportHeight)
    );
    if (visualOcclusion > KEYBOARD_CLOSE_THRESHOLD_PX) {
      return 0;
    }
  }
  return layoutOcclusion;
}

/**
 * Reads the live viewport instead of the tracked session state, so callers can
 * tell whether a keyboard is on screen right now.
 */
export function isKeyboardOccludingViewport(
  win: Pick<Window, 'innerHeight'> & {
    visualViewport?: VisualViewportLike | null;
  },
  baselineInnerHeight = layoutViewportBaseline
): boolean {
  const visualHeight = win.visualViewport?.height ?? win.innerHeight;
  const visualOcclusion = win.visualViewport
    ? Math.max(
        resolveKeyboardOcclusion(
          win.innerHeight,
          win.visualViewport.height,
          win.visualViewport.offsetTop
        ),
        resolveKeyboardInset(
          resolveRestingViewportHeight(
            win.innerHeight,
            visualHeight,
            baselineInnerHeight
          ),
          visualHeight
        )
      )
    : 0;
  const layoutOcclusion = resolveLayoutKeyboardOcclusion(
    baselineInnerHeight,
    win.innerHeight,
    win.visualViewport?.height
  );
  return (
    Math.max(visualOcclusion, layoutOcclusion) > KEYBOARD_OPEN_THRESHOLD_PX
  );
}

export function resolveKeyboardOpen(
  keyboardInset: number,
  wasOpen: boolean
): boolean {
  return wasOpen
    ? keyboardInset > KEYBOARD_CLOSE_THRESHOLD_PX
    : keyboardInset > KEYBOARD_OPEN_THRESHOLD_PX;
}

export function isEditableElement(element: Element | null): boolean {
  if (!element || !(element instanceof HTMLElement)) {
    return false;
  }
  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element.isContentEditable
  );
}

export function shouldStartKeyboardDismiss(params: {
  keyboardOpen: boolean;
  dismissing: boolean;
  focused: boolean;
}): boolean {
  return params.keyboardOpen && !params.dismissing && !params.focused;
}

/**
 * Keep the keyboard up while focus is moving inside the composer (send,
 * tools, another field). A Done/back dismiss has no related target.
 */
export function shouldHoldKeyboardDismiss(
  nextTarget: EventTarget | null
): boolean {
  if (!(nextTarget instanceof Element)) {
    return false;
  }
  return (
    isEditableElement(nextTarget) ||
    !!nextTarget.closest('[data-chat-composer]')
  );
}

/**
 * Safari cancels an in-flight keyboard presentation when the focused input's
 * ancestor gains or loses a transform, so a session may only start once we can
 * tell the report belongs to the new keyboard: either the occlusion is still
 * growing, or it has settled at its final size. Reports that arrive right
 * after a quick re-tap describe the previous keyboard sliding away, and those
 * shrink.
 */
export function shouldEnterKeyboardSession(params: {
  focused: boolean;
  occlusion: number;
  previousOcclusion: number;
  settledForMs: number;
}): boolean {
  // The keyboard cannot be up without a focused input, so a report that still
  // describes the old keyboard here is only Safari catching up.
  if (!params.focused) {
    return false;
  }
  if (!resolveKeyboardOpen(params.occlusion, false)) {
    return false;
  }
  if (params.occlusion > params.previousOcclusion) {
    return true;
  }
  return (
    params.occlusion === params.previousOcclusion &&
    params.settledForMs >= KEYBOARD_OPEN_SETTLED_MS
  );
}

/**
 * While the composer keeps focus, a lone closed report is usually Safari
 * swapping keyboards or reporting mid-animation, so confirm it before dropping
 * the lift and making the composer flap.
 */
export function shouldConfirmKeyboardClose(params: {
  focused: boolean;
  keyboardOpen: boolean;
  reportedOpen: boolean;
  closedForMs: number;
}): boolean {
  return (
    params.focused &&
    params.keyboardOpen &&
    !params.reportedOpen &&
    params.closedForMs < KEYBOARD_CLOSE_CONFIRM_MS
  );
}

/**
 * Android leaves the composer focused after the back or collapse key hides the
 * IME. Dropping that leftover focus means the next tap is a real focus, which
 * can open the keyboard without racing the previous hide.
 */
export function shouldReleaseEditableFocus(params: {
  wasOpen: boolean;
  keyboardOpen: boolean;
  dismissing: boolean;
  focused: boolean;
}): boolean {
  return (
    params.wasOpen &&
    !params.keyboardOpen &&
    !params.dismissing &&
    params.focused
  );
}

/**
 * Scrolling the home page should put the keyboard away, but a focus-driven
 * scroll into view must not, otherwise opening the composer would dismiss it.
 */
export function shouldDismissKeyboardOnHomeScroll(params: {
  focusedInsideHome: boolean;
  keyboardVisible: boolean;
  userScrolling: boolean;
}): boolean {
  return (
    params.focusedInsideHome && params.keyboardVisible && params.userScrolling
  );
}

export function closedKeyboardMetrics(
  height: number,
  offsetTop = 0
): VisualViewportMetrics {
  return {
    height,
    offsetTop,
    keyboardOpen: false,
  };
}

export function getVisualViewportMetrics(
  visualViewport: VisualViewportLike | null | undefined,
  innerHeight: number,
  wasOpen = false,
  layoutKeyboardOpen = false,
  layoutBaseline = 0,
  focused = false,
  appleMobile = false
): VisualViewportMetrics {
  const visualHeight = visualViewport?.height || innerHeight;
  const offsetTop = Math.max(0, Math.round(visualViewport?.offsetTop || 0));
  const layoutHeight = resolveRestingViewportHeight(
    innerHeight,
    visualHeight,
    layoutBaseline
  );
  const occlusion = resolveKeyboardOcclusion(
    layoutHeight,
    visualHeight,
    offsetTop
  );
  const keyboardOpen =
    resolveKeyboardOpen(occlusion, wasOpen) || layoutKeyboardOpen;
  const followViewport =
    keyboardOpen ||
    (focused &&
      shouldFollowViewportOnFocus({
        appleMobile,
        layoutKeyboardOpen,
      }));
  const height = followViewport
    ? resolveVisibleViewportHeight(innerHeight, visualHeight, offsetTop)
    : layoutHeight;

  return {
    height,
    // Following Safari's pan (`offsetTop`) drops the short shell and then
    // lifts it back. Keep the shell at the top of the visual viewport.
    offsetTop: 0,
    keyboardOpen,
  };
}

export function applyVisualViewportMetrics(
  root: HTMLElement,
  metrics: VisualViewportMetrics
): void {
  const height = `${metrics.height}px`;
  const offsetTop = `${metrics.offsetTop}px`;
  root.style.setProperty('--app-height', height);
  root.style.setProperty('--app-offset-top', offsetTop);
  root.style.height = height;
  const doc = root.ownerDocument;
  if (doc.documentElement === root) {
    const body = doc.body;
    if (body) {
      body.style.height = height;
      body.style.top = offsetTop;
    }
    const appRoot = doc.getElementById('root');
    if (appRoot) {
      appRoot.style.removeProperty('padding-bottom');
    }
  }
  root.classList.toggle('keyboard-open', metrics.keyboardOpen);
}

export function syncVisualViewport(
  target: VisualViewportTarget = window as unknown as VisualViewportTarget,
  wasOpen = false
): VisualViewportMetrics {
  const metrics = getVisualViewportMetrics(
    target.visualViewport,
    target.innerHeight,
    wasOpen
  );
  applyVisualViewportMetrics(target.document.documentElement, metrics);
  notifyKeyboardInsetChange(target.document, metrics);
  if (!metrics.keyboardOpen && (target.scrollX !== 0 || target.scrollY !== 0)) {
    target.scrollTo(0, 0);
  }
  return metrics;
}

export function bindVisualViewport(
  target: VisualViewportTarget = window as unknown as VisualViewportTarget,
  options: BindVisualViewportOptions = {}
): () => void {
  const visualViewport = target.visualViewport as
    | (VisualViewportLike & {
        addEventListener?: Window['addEventListener'];
        removeEventListener?: Window['removeEventListener'];
      })
    | null
    | undefined;
  const timers = target.document.defaultView ?? globalThis;
  const root = target.document.documentElement;
  const appleMobile = isAppleMobileUserAgent(
    options.userAgent ?? target.document.defaultView?.navigator.userAgent ?? ''
  );

  let keyboardOpen = false;
  let dismissing = false;
  let dismissFollowsViewport = false;
  let publishedKey = '';
  let sampledOcclusion = 0;
  let sampledOcclusionAt = 0;
  let closedSince = 0;
  let dismissTimer = 0;
  let dismissDelayTimer = 0;
  let closeConfirmTimer = 0;
  let openWatchTimer = 0;
  let openWatchStart = 0;
  let safariOpenDelayTimer = 0;
  let safariOpenDelayElapsed = false;
  let safariOpeningMinHeight = 0;

  root.style.setProperty('--keyboard-dismiss-ms', `${KEYBOARD_DISMISS_MS}ms`);

  const stopOpenWatch = () => {
    timers.clearTimeout(openWatchTimer);
    openWatchTimer = 0;
  };

  const finishDismiss = () => {
    dismissing = false;
    dismissFollowsViewport = false;
    timers.clearTimeout(dismissTimer);
    timers.clearTimeout(dismissDelayTimer);
    timers.clearTimeout(safariOpenDelayTimer);
    dismissTimer = 0;
    dismissDelayTimer = 0;
    safariOpenDelayTimer = 0;
    safariOpenDelayElapsed = false;
    safariOpeningMinHeight = 0;
    root.classList.remove('keyboard-dismissing');
    root.classList.remove('keyboard-dismiss-animate');
    if (
      !isEditableElement(target.document.activeElement) &&
      (target.scrollX !== 0 || target.scrollY !== 0)
    ) {
      target.scrollTo(0, 0);
    }
  };

  const publish = (metrics: VisualViewportMetrics) => {
    const focused = isEditableElement(target.document.activeElement);
    // Do not copy Safari's offsetTop onto the shell. Resetting window scroll
    // is enough to stop a document pan; visualViewport.offsetTop is separate
    // and following it is what walks the page down then back up.
    if (focused && (target.scrollX !== 0 || target.scrollY !== 0)) {
      target.scrollTo(0, 0);
    } else if (
      !metrics.keyboardOpen &&
      !dismissing &&
      (target.scrollX !== 0 || target.scrollY !== 0)
    ) {
      target.scrollTo(0, 0);
    }

    const key = `${metrics.keyboardOpen}:${metrics.height}:${metrics.offsetTop}`;
    const unchanged = key === publishedKey;
    publishedKey = key;

    const wasOpen = keyboardOpen;
    keyboardOpen = metrics.keyboardOpen;
    if (!metrics.keyboardOpen) {
      safariOpenDelayElapsed = false;
      safariOpeningMinHeight = 0;
    }
    if (!unchanged) {
      applyVisualViewportMetrics(root, metrics);
      notifyKeyboardInsetChange(target.document, metrics);
    }

    const activeElement = target.document.activeElement;
    if (
      shouldReleaseEditableFocus({
        wasOpen,
        keyboardOpen: metrics.keyboardOpen,
        dismissing,
        focused: isEditableElement(activeElement),
      })
    ) {
      (activeElement as HTMLElement).blur();
    }
  };

  const startDismiss = () => {
    if (
      !shouldStartKeyboardDismiss({
        keyboardOpen,
        dismissing,
        focused: isEditableElement(target.document.activeElement),
      })
    ) {
      return;
    }
    const layoutBaseline = noteLayoutViewportBaseline(target.innerHeight);
    const layoutOcclusion = resolveLayoutKeyboardOcclusion(
      layoutBaseline,
      target.innerHeight,
      target.visualViewport?.height
    );
    // WeChat shrinks innerHeight with the keyboard, so the shell must keep
    // following that viewport. Safari keeps innerHeight and animates the
    // visual viewport; interpolating once to rest matches that animation
    // instead of restyling the page on every frame.
    dismissFollowsViewport = resolveKeyboardOpen(layoutOcclusion, true);
    dismissing = true;
    root.classList.add('keyboard-dismissing');
    if (dismissFollowsViewport) {
      sync();
      dismissTimer = timers.setTimeout(() => {
        if (!dismissing) {
          return;
        }
        finishDismiss();
        sync();
      }, KEYBOARD_DISMISS_MS) as unknown as number;
      return;
    }

    root.classList.add('keyboard-dismiss-animate');
    void (target.document.body?.offsetHeight ?? root.offsetHeight);
    const restingHeight = resolveRestingViewportHeight(
      target.innerHeight,
      target.visualViewport?.height,
      layoutBaseline
    );
    publish({
      height: restingHeight,
      offsetTop: 0,
      keyboardOpen: true,
    });
    dismissTimer = timers.setTimeout(() => {
      if (!dismissing) {
        return;
      }
      publish(closedKeyboardMetrics(restingHeight, 0));
      finishDismiss();
    }, KEYBOARD_DISMISS_MS) as unknown as number;
  };

  const sync = () => {
    timers.clearTimeout(closeConfirmTimer);
    closeConfirmTimer = 0;

    const now = Date.now();
    const focused = isEditableElement(target.document.activeElement);
    const visualHeight = target.visualViewport?.height || target.innerHeight;
    const layoutBaseline = noteLayoutViewportBaseline(target.innerHeight);
    const height = resolveRestingViewportHeight(
      target.innerHeight,
      visualHeight,
      layoutBaseline
    );
    const layoutOcclusion = resolveLayoutKeyboardOcclusion(
      layoutBaseline,
      target.innerHeight,
      visualHeight
    );
    const occlusion = Math.max(
      resolveKeyboardOcclusion(
        height,
        visualHeight,
        target.visualViewport?.offsetTop || 0
      ),
      layoutOcclusion
    );
    const previousOcclusion = sampledOcclusion;
    const settledForMs =
      occlusion === sampledOcclusion ? now - sampledOcclusionAt : 0;
    if (occlusion !== sampledOcclusion) {
      sampledOcclusion = occlusion;
      sampledOcclusionAt = now;
    }

    if (focused && dismissing) {
      finishDismiss();
    }

    if (
      dismissing &&
      !focused &&
      !dismissFollowsViewport &&
      dismissDelayTimer === 0
    ) {
      return;
    }

    const layoutKeyboardOpen = resolveKeyboardOpen(
      layoutOcclusion,
      keyboardOpen || dismissing
    );
    const reported = getVisualViewportMetrics(
      target.visualViewport,
      target.innerHeight,
      keyboardOpen || dismissing,
      layoutKeyboardOpen,
      layoutBaseline,
      focused,
      appleMobile
    );

    if (focused) {
      if (closedSince === 0 && !reported.keyboardOpen) {
        closedSince = now;
      }
      if (
        shouldConfirmKeyboardClose({
          focused,
          keyboardOpen,
          reportedOpen: reported.keyboardOpen,
          closedForMs: now - closedSince,
        })
      ) {
        closeConfirmTimer = timers.setTimeout(
          sync,
          KEYBOARD_CLOSE_CONFIRM_MS
        ) as unknown as number;
        return;
      }
      if (reported.keyboardOpen) {
        closedSince = 0;
      }
      if (
        shouldDelaySafariOpeningPaint({
          appleMobile,
          layoutKeyboardOpen,
          keyboardAlreadyOpen: keyboardOpen,
          reportedOpen: reported.keyboardOpen,
          delayElapsed: safariOpenDelayElapsed,
          reportedHeight: reported.height,
          openingMinHeight: safariOpeningMinHeight,
        })
      ) {
        if (
          safariOpeningMinHeight === 0 ||
          reported.height < safariOpeningMinHeight
        ) {
          safariOpeningMinHeight = reported.height;
        }
        if (safariOpenDelayTimer === 0) {
          safariOpenDelayTimer = timers.setTimeout(() => {
            safariOpenDelayTimer = 0;
            safariOpenDelayElapsed = true;
            sync();
          }, KEYBOARD_OPEN_DELAY_MS) as unknown as number;
        }
        return;
      }
      publish(reported);
      if (dismissing && !reported.keyboardOpen) {
        finishDismiss();
      }
      return;
    }

    if (dismissDelayTimer !== 0 && !dismissing) {
      return;
    }

    if (dismissing) {
      publish(reported);
      if (!reported.keyboardOpen) {
        finishDismiss();
      }
      return;
    }

    if (!keyboardOpen) {
      // Safari is still deciding whether to present the keyboard. Leave the
      // composer where it is until the report is known to describe the new
      // keyboard, otherwise the presentation is cancelled.
      if (
        !shouldEnterKeyboardSession({
          focused,
          occlusion,
          previousOcclusion,
          settledForMs,
        })
      ) {
        publish(closedKeyboardMetrics(height, 0));
        return;
      }
      closedSince = 0;
      publish(reported);
      return;
    }

    if (closedSince === 0 && !reported.keyboardOpen) {
      closedSince = now;
    }
    if (
      shouldConfirmKeyboardClose({
        focused,
        keyboardOpen,
        reportedOpen: reported.keyboardOpen,
        closedForMs: now - closedSince,
      })
    ) {
      closeConfirmTimer = timers.setTimeout(
        sync,
        KEYBOARD_CLOSE_CONFIRM_MS
      ) as unknown as number;
      return;
    }
    if (reported.keyboardOpen) {
      closedSince = 0;
    }

    publish(reported);
  };

  const tickOpenWatch = () => {
    if (!isEditableElement(target.document.activeElement)) {
      stopOpenWatch();
      return;
    }
    sync();
    if (Date.now() - openWatchStart < KEYBOARD_OPEN_WATCH_MS) {
      openWatchTimer = timers.setTimeout(
        tickOpenWatch,
        16
      ) as unknown as number;
    }
  };

  const startOpenWatch = () => {
    stopOpenWatch();
    openWatchStart = Date.now();
    sync();
    openWatchTimer = timers.setTimeout(tickOpenWatch, 16) as unknown as number;
  };

  const onFocusIn = () => {
    if (!isEditableElement(target.document.activeElement)) {
      return;
    }
    timers.clearTimeout(dismissDelayTimer);
    dismissDelayTimer = 0;
    if (dismissing) {
      finishDismiss();
    }
    startOpenWatch();
  };

  const onFocusOut = (event: Event) => {
    stopOpenWatch();
    timers.clearTimeout(closeConfirmTimer);
    closeConfirmTimer = 0;
    closedSince = 0;
    timers.clearTimeout(dismissDelayTimer);
    dismissDelayTimer = 0;
    const nextTarget = event instanceof FocusEvent ? event.relatedTarget : null;
    if (shouldHoldKeyboardDismiss(nextTarget)) {
      dismissDelayTimer = timers.setTimeout(() => {
        dismissDelayTimer = 0;
        startDismiss();
      }, KEYBOARD_DISMISS_DELAY_MS) as unknown as number;
      return;
    }
    startDismiss();
  };

  let homeUserScrolling = false;

  const isFocusedInsideHome = () => {
    const active = target.document.activeElement;
    return (
      isEditableElement(active) &&
      !!(active as HTMLElement).closest('[data-chat-home]')
    );
  };

  const onPointerDown = (event: Event) => {
    const node = event.target;
    homeUserScrolling =
      node instanceof Element && !node.closest('[data-chat-composer]');
  };

  const onPointerUp = () => {
    homeUserScrolling = false;
  };

  const onHomeScroll = (event: Event) => {
    const node = event.target;
    if (!(node instanceof Element) || !node.closest('[data-chat-home]')) {
      return;
    }
    const active = target.document.activeElement;
    if (
      !shouldDismissKeyboardOnHomeScroll({
        focusedInsideHome: isFocusedInsideHome(),
        keyboardVisible:
          keyboardOpen ||
          isKeyboardOccludingViewport(target, layoutViewportBaseline),
        userScrolling: homeUserScrolling,
      })
    ) {
      return;
    }
    (active as HTMLElement).blur();
  };

  const onOrientationChange = () => {
    // A rotated device has a different layout viewport, so the old baseline
    // would look like a keyboard that never goes away.
    resetLayoutViewportBaseline(target.innerHeight);
    sync();
  };

  resetLayoutViewportBaseline(target.innerHeight);
  sync();
  target.addEventListener('resize', sync);
  target.addEventListener('orientationchange', onOrientationChange);
  visualViewport?.addEventListener?.('resize', sync);
  visualViewport?.addEventListener?.('scroll', sync);
  target.document.addEventListener('focusin', onFocusIn);
  target.document.addEventListener('focusout', onFocusOut);
  target.document.addEventListener('pointerdown', onPointerDown, true);
  target.document.addEventListener('pointerup', onPointerUp, true);
  target.document.addEventListener('pointercancel', onPointerUp, true);
  target.document.addEventListener('scroll', onHomeScroll, true);

  return () => {
    stopOpenWatch();
    timers.clearTimeout(closeConfirmTimer);
    finishDismiss();
    target.removeEventListener('resize', sync);
    target.removeEventListener('orientationchange', onOrientationChange);
    visualViewport?.removeEventListener?.('resize', sync);
    visualViewport?.removeEventListener?.('scroll', sync);
    target.document.removeEventListener('focusin', onFocusIn);
    target.document.removeEventListener('focusout', onFocusOut);
    target.document.removeEventListener('pointerdown', onPointerDown, true);
    target.document.removeEventListener('pointerup', onPointerUp, true);
    target.document.removeEventListener('pointercancel', onPointerUp, true);
    target.document.removeEventListener('scroll', onHomeScroll, true);
  };
}
