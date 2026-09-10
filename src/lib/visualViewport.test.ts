/** @jest-environment jsdom */

import {
  applyVisualViewportMetrics,
  bindVisualViewport,
  closedKeyboardMetrics,
  getVisualViewportMetrics,
  isAppleMobileUserAgent,
  isKeyboardOccludingViewport,
  KEYBOARD_CLOSE_CONFIRM_MS,
  KEYBOARD_DISMISS_DELAY_MS,
  KEYBOARD_DISMISS_MS,
  KEYBOARD_INSET_CHANGE_EVENT,
  KEYBOARD_OPEN_DELAY_MS,
  KEYBOARD_OPEN_REBOUND_PX,
  KEYBOARD_OPEN_SETTLED_MS,
  noteLayoutViewportBaseline,
  notifyKeyboardInsetChange,
  resetLayoutViewportBaseline,
  resolveKeyboardInset,
  resolveKeyboardOcclusion,
  resolveKeyboardOpen,
  resolveLayoutKeyboardOcclusion,
  resolveRestingViewportHeight,
  resolveVisibleViewportHeight,
  shouldConfirmKeyboardClose,
  shouldDelaySafariOpeningPaint,
  shouldDismissKeyboardOnHomeScroll,
  shouldEnterKeyboardSession,
  shouldFollowViewportOnFocus,
  shouldHoldKeyboardDismiss,
  shouldReleaseEditableFocus,
  shouldStartKeyboardDismiss,
  syncVisualViewport,
} from './visualViewport';

const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15';

describe('isAppleMobileUserAgent', () => {
  it('detects iPhone and ignores Android', () => {
    expect(isAppleMobileUserAgent(IPHONE_UA)).toBe(true);
    expect(
      isAppleMobileUserAgent('Mozilla/5.0 (Linux; Android 14) Chrome/120.0.0.0')
    ).toBe(false);
  });
});

describe('shouldFollowViewportOnFocus', () => {
  it('lets Android and WeChat follow on focus, but not Safari', () => {
    expect(
      shouldFollowViewportOnFocus({
        appleMobile: false,
        layoutKeyboardOpen: false,
      })
    ).toBe(true);
    expect(
      shouldFollowViewportOnFocus({
        appleMobile: true,
        layoutKeyboardOpen: true,
      })
    ).toBe(true);
    expect(
      shouldFollowViewportOnFocus({
        appleMobile: true,
        layoutKeyboardOpen: false,
      })
    ).toBe(false);
  });
});

describe('shouldDelaySafariOpeningPaint', () => {
  it('holds Safari’s undershoot until rebound or the opening delay', () => {
    expect(
      shouldDelaySafariOpeningPaint({
        appleMobile: true,
        layoutKeyboardOpen: false,
        keyboardAlreadyOpen: false,
        reportedOpen: true,
        delayElapsed: false,
        reportedHeight: 351,
        openingMinHeight: 0,
      })
    ).toBe(true);
    expect(
      shouldDelaySafariOpeningPaint({
        appleMobile: true,
        layoutKeyboardOpen: false,
        keyboardAlreadyOpen: false,
        reportedOpen: true,
        delayElapsed: false,
        reportedHeight: 351,
        openingMinHeight: 351,
      })
    ).toBe(true);
    expect(
      shouldDelaySafariOpeningPaint({
        appleMobile: true,
        layoutKeyboardOpen: false,
        keyboardAlreadyOpen: false,
        reportedOpen: true,
        delayElapsed: false,
        reportedHeight: 395,
        openingMinHeight: 351,
      })
    ).toBe(false);
    expect(
      shouldDelaySafariOpeningPaint({
        appleMobile: true,
        layoutKeyboardOpen: false,
        keyboardAlreadyOpen: false,
        reportedOpen: true,
        delayElapsed: true,
        reportedHeight: 351,
        openingMinHeight: 351,
      })
    ).toBe(false);
    expect(
      shouldDelaySafariOpeningPaint({
        appleMobile: false,
        layoutKeyboardOpen: false,
        keyboardAlreadyOpen: false,
        reportedOpen: true,
        delayElapsed: false,
        reportedHeight: 351,
        openingMinHeight: 0,
      })
    ).toBe(false);
    expect(KEYBOARD_OPEN_REBOUND_PX).toBeGreaterThan(0);
  });
});

describe('resolveKeyboardInset', () => {
  it('uses the full keyboard occlusion so short chats are pushed up', () => {
    expect(resolveKeyboardInset(852, 400)).toBe(452);
    expect(resolveKeyboardInset(852, 620)).toBe(232);
    expect(resolveKeyboardInset(852, 852)).toBe(0);
  });
});

describe('resolveVisibleViewportHeight', () => {
  it('uses the smaller of layout and visual height so the composer sits in the visible viewport', () => {
    expect(resolveVisibleViewportHeight(852, 400)).toBe(400);
    expect(resolveVisibleViewportHeight(400, 852)).toBe(400);
    expect(resolveVisibleViewportHeight(852, 852)).toBe(852);
    expect(resolveVisibleViewportHeight(800, null)).toBe(800);
  });

  it('treats a Chrome pan as the keyboard when the visual viewport did not shrink', () => {
    expect(resolveVisibleViewportHeight(852, 852, 300)).toBe(552);
  });

  it('ignores Safari pan once the visual viewport has already shrunk', () => {
    expect(resolveVisibleViewportHeight(852, 400, 220)).toBe(400);
  });
});

describe('resolveKeyboardOcclusion', () => {
  it('uses visual shrink when the keyboard overlays from the bottom', () => {
    expect(resolveKeyboardOcclusion(852, 400, 220)).toBe(452);
  });

  it('uses the pan when Chrome leaves visualViewport height unchanged', () => {
    expect(resolveKeyboardOcclusion(852, 852, 300)).toBe(300);
  });
});

describe('resolveRestingViewportHeight', () => {
  it('keeps the tallest viewport after the keyboard closes', () => {
    expect(resolveRestingViewportHeight(852, 400)).toBe(852);
    expect(resolveRestingViewportHeight(400, 852)).toBe(852);
    expect(resolveRestingViewportHeight(400, 400, 852)).toBe(852);
  });
});

describe('resolveLayoutKeyboardOcclusion', () => {
  it('measures the keyboard an in-app WebView took out of the layout', () => {
    expect(resolveLayoutKeyboardOcclusion(852, 400)).toBe(452);
    expect(resolveLayoutKeyboardOcclusion(852, 400, 852)).toBe(452);
    expect(resolveLayoutKeyboardOcclusion(852, 852)).toBe(0);
    expect(resolveLayoutKeyboardOcclusion(852, 900)).toBe(0);
  });

  it('ignores Safari lowering innerHeight together with visualViewport', () => {
    expect(resolveLayoutKeyboardOcclusion(619, 395, 395)).toBe(0);
    expect(resolveLayoutKeyboardOcclusion(619, 619, 395)).toBe(0);
  });
});

describe('noteLayoutViewportBaseline', () => {
  it('keeps the tallest layout viewport so the keyboard stays measurable', () => {
    resetLayoutViewportBaseline(852);
    expect(noteLayoutViewportBaseline(400)).toBe(852);
    expect(noteLayoutViewportBaseline(900)).toBe(900);
  });
});

describe('isKeyboardOccludingViewport', () => {
  it('reports the keyboard when only the layout viewport shrank', () => {
    expect(
      isKeyboardOccludingViewport(
        { innerHeight: 400, visualViewport: { height: 400, offsetTop: 0 } },
        852
      )
    ).toBe(true);
  });

  it('reports a keyboard that is on screen right now', () => {
    expect(
      isKeyboardOccludingViewport({
        innerHeight: 852,
        visualViewport: { height: 400, offsetTop: 0 },
      })
    ).toBe(true);
  });

  it('does not mistake the address bar for a keyboard', () => {
    expect(
      isKeyboardOccludingViewport({
        innerHeight: 852,
        visualViewport: { height: 780, offsetTop: 0 },
      })
    ).toBe(false);
  });

  it('reports no keyboard when the viewport cannot be measured', () => {
    expect(isKeyboardOccludingViewport({ innerHeight: 852 }, 852)).toBe(false);
  });

  it('reports a Chrome keyboard that pans instead of shrinking the visual viewport', () => {
    expect(
      isKeyboardOccludingViewport({
        innerHeight: 852,
        visualViewport: { height: 852, offsetTop: 300 },
      })
    ).toBe(true);
  });
});

describe('shouldStartKeyboardDismiss', () => {
  it('starts dismiss as soon as the composer loses focus', () => {
    expect(
      shouldStartKeyboardDismiss({
        keyboardOpen: true,
        dismissing: false,
        focused: false,
      })
    ).toBe(true);
  });

  it('does not restart dismiss while already returning to rest', () => {
    expect(
      shouldStartKeyboardDismiss({
        keyboardOpen: true,
        dismissing: true,
        focused: false,
      })
    ).toBe(false);
  });
});

describe('shouldHoldKeyboardDismiss', () => {
  it('holds dismiss while focus stays inside the composer', () => {
    const composer = document.createElement('div');
    composer.setAttribute('data-chat-composer', '');
    const button = document.createElement('button');
    composer.appendChild(button);
    document.body.appendChild(composer);

    expect(shouldHoldKeyboardDismiss(button)).toBe(true);

    composer.remove();
  });

  it('does not hold dismiss when the keyboard is put away', () => {
    expect(shouldHoldKeyboardDismiss(null)).toBe(false);
  });
});

describe('shouldEnterKeyboardSession', () => {
  it('starts a session as soon as the keyboard is rising', () => {
    expect(
      shouldEnterKeyboardSession({
        focused: true,
        occlusion: 300,
        previousOcclusion: 0,
        settledForMs: 0,
      })
    ).toBe(true);
  });

  it('ignores the previous keyboard still sliding away', () => {
    expect(
      shouldEnterKeyboardSession({
        focused: true,
        occlusion: 300,
        previousOcclusion: 452,
        settledForMs: 0,
      })
    ).toBe(false);
  });

  it('starts a session for a keyboard that never left', () => {
    expect(
      shouldEnterKeyboardSession({
        focused: true,
        occlusion: 452,
        previousOcclusion: 452,
        settledForMs: KEYBOARD_OPEN_SETTLED_MS,
      })
    ).toBe(true);
    expect(
      shouldEnterKeyboardSession({
        focused: true,
        occlusion: 452,
        previousOcclusion: 452,
        settledForMs: 16,
      })
    ).toBe(false);
  });

  it('never treats an address-bar sized shrink as a keyboard', () => {
    expect(
      shouldEnterKeyboardSession({
        focused: true,
        occlusion: 72,
        previousOcclusion: 0,
        settledForMs: KEYBOARD_OPEN_SETTLED_MS,
      })
    ).toBe(false);
  });

  it('never starts a session without a focused input', () => {
    expect(
      shouldEnterKeyboardSession({
        focused: false,
        occlusion: 452,
        previousOcclusion: 0,
        settledForMs: KEYBOARD_OPEN_SETTLED_MS,
      })
    ).toBe(false);
  });
});

describe('shouldConfirmKeyboardClose', () => {
  it('waits out a lone closed report while the composer keeps focus', () => {
    expect(
      shouldConfirmKeyboardClose({
        focused: true,
        keyboardOpen: true,
        reportedOpen: false,
        closedForMs: 0,
      })
    ).toBe(true);
  });

  it('accepts the close once it has been reported for long enough', () => {
    expect(
      shouldConfirmKeyboardClose({
        focused: true,
        keyboardOpen: true,
        reportedOpen: false,
        closedForMs: KEYBOARD_CLOSE_CONFIRM_MS,
      })
    ).toBe(false);
  });

  it('does not delay the close once the composer is blurred', () => {
    expect(
      shouldConfirmKeyboardClose({
        focused: false,
        keyboardOpen: true,
        reportedOpen: false,
        closedForMs: 0,
      })
    ).toBe(false);
  });
});

describe('shouldReleaseEditableFocus', () => {
  it('drops leftover focus after Android hides the keyboard', () => {
    expect(
      shouldReleaseEditableFocus({
        wasOpen: true,
        keyboardOpen: false,
        dismissing: false,
        focused: true,
      })
    ).toBe(true);
  });

  it('leaves focus alone while the keyboard is up or dismissing', () => {
    expect(
      shouldReleaseEditableFocus({
        wasOpen: true,
        keyboardOpen: true,
        dismissing: false,
        focused: true,
      })
    ).toBe(false);
    expect(
      shouldReleaseEditableFocus({
        wasOpen: true,
        keyboardOpen: false,
        dismissing: true,
        focused: true,
      })
    ).toBe(false);
  });
});

describe('shouldDismissKeyboardOnHomeScroll', () => {
  it('dismisses when the user scrolls the home page with the keyboard up', () => {
    expect(
      shouldDismissKeyboardOnHomeScroll({
        focusedInsideHome: true,
        keyboardVisible: true,
        userScrolling: true,
      })
    ).toBe(true);
  });

  it('leaves the keyboard up when focus itself scrolls the composer into view', () => {
    expect(
      shouldDismissKeyboardOnHomeScroll({
        focusedInsideHome: true,
        keyboardVisible: true,
        userScrolling: false,
      })
    ).toBe(false);
  });
});

describe('closedKeyboardMetrics', () => {
  it('returns a closed shell at the resting height', () => {
    expect(closedKeyboardMetrics(400)).toEqual({
      height: 400,
      offsetTop: 0,
      keyboardOpen: false,
    });
  });
});

describe('resolveKeyboardOpen', () => {
  it('ignores address-bar sized shrinks until a keyboard session starts', () => {
    expect(resolveKeyboardOpen(72, false)).toBe(false);
    expect(resolveKeyboardOpen(160, false)).toBe(true);
  });

  it('keeps tracking through the last part of dismiss', () => {
    expect(resolveKeyboardOpen(80, true)).toBe(true);
    expect(resolveKeyboardOpen(8, true)).toBe(false);
  });
});

describe('getVisualViewportMetrics', () => {
  it('falls back to innerHeight when visualViewport is missing', () => {
    expect(getVisualViewportMetrics(null, 800)).toEqual({
      height: 800,
      offsetTop: 0,
      keyboardOpen: false,
    });
  });

  it('shrinks the app from the bottom as soon as the keyboard is up', () => {
    expect(
      getVisualViewportMetrics({ height: 400, offsetTop: 220 }, 852)
    ).toEqual({
      height: 400,
      offsetTop: 0,
      keyboardOpen: true,
    });
  });

  it('does not wait for Safari to pan before shrinking', () => {
    expect(
      getVisualViewportMetrics({ height: 400, offsetTop: 0 }, 852)
    ).toEqual({
      height: 400,
      offsetTop: 0,
      keyboardOpen: true,
    });
  });

  it('does not walk the Safari shell down with the visual viewport pan', () => {
    expect(
      getVisualViewportMetrics(
        { height: 400, offsetTop: 220 },
        852,
        false,
        false,
        0,
        true,
        true
      )
    ).toEqual({
      height: 400,
      offsetTop: 0,
      keyboardOpen: true,
    });
  });

  it('follows the visible height as soon as the composer is focused', () => {
    expect(
      getVisualViewportMetrics(
        { height: 780, offsetTop: 0 },
        852,
        false,
        false,
        0,
        true
      )
    ).toEqual({
      height: 780,
      offsetTop: 0,
      keyboardOpen: false,
    });
  });

  it('does not shrink an iPhone page until the keyboard is actually up', () => {
    expect(
      getVisualViewportMetrics(
        { height: 780, offsetTop: 0 },
        852,
        false,
        false,
        0,
        true,
        true
      )
    ).toEqual({
      height: 852,
      offsetTop: 0,
      keyboardOpen: false,
    });
  });

  it('treats Safari innerHeight flash as a visual keyboard, not WeChat', () => {
    expect(
      getVisualViewportMetrics(
        { height: 395, offsetTop: 0 },
        395,
        false,
        false,
        619,
        true,
        true
      )
    ).toEqual({
      height: 395,
      offsetTop: 0,
      keyboardOpen: true,
    });
  });

  it('does not drop the page when Safari pans the visual viewport', () => {
    expect(
      getVisualViewportMetrics(
        { height: 400, offsetTop: 220 },
        852,
        false,
        false,
        0,
        true
      )
    ).toEqual({
      height: 400,
      offsetTop: 0,
      keyboardOpen: true,
    });
  });

  it('lifts the shell when Chrome pans and leaves visualViewport height full', () => {
    expect(
      getVisualViewportMetrics(
        { height: 852, offsetTop: 300 },
        852,
        false,
        false,
        0,
        true
      )
    ).toEqual({
      height: 552,
      offsetTop: 0,
      keyboardOpen: true,
    });
  });

  it('shrinks to innerHeight when WeChat leaves visualViewport at the full window', () => {
    expect(
      getVisualViewportMetrics({ height: 852, offsetTop: 0 }, 400, false, true)
    ).toEqual({
      height: 400,
      offsetTop: 0,
      keyboardOpen: true,
    });
  });

  it('adds no extra lift for a keyboard the layout viewport already made room for', () => {
    expect(
      getVisualViewportMetrics(
        { height: 400, offsetTop: 0 },
        400,
        false,
        true,
        852
      )
    ).toEqual({
      height: 400,
      offsetTop: 0,
      keyboardOpen: true,
    });
  });
});

describe('applyVisualViewportMetrics', () => {
  it('pins the app shell to the visible viewport', () => {
    const root = document.createElement('html');
    applyVisualViewportMetrics(root, {
      height: 400,
      offsetTop: 180,
      keyboardOpen: true,
    });
    expect(root.style.getPropertyValue('--app-height')).toBe('400px');
    expect(root.style.getPropertyValue('--app-offset-top')).toBe('180px');
    expect(root.style.height).toBe('400px');
    expect(root.classList.contains('keyboard-open')).toBe(true);
  });

  it('keeps the Safari shell at the top of the visual viewport', () => {
    const root = document.createElement('html');
    applyVisualViewportMetrics(root, {
      height: 400,
      offsetTop: 0,
      keyboardOpen: true,
    });
    expect(root.style.getPropertyValue('--app-height')).toBe('400px');
    expect(root.style.getPropertyValue('--app-offset-top')).toBe('0px');
    expect(root.style.height).toBe('400px');
  });
});

describe('notifyKeyboardInsetChange', () => {
  it('emits the inset so the message list can keep the last actions visible', () => {
    const listener = jest.fn();
    document.addEventListener(KEYBOARD_INSET_CHANGE_EVENT, listener);
    notifyKeyboardInsetChange(document, {
      height: 400,
      offsetTop: 0,
      keyboardOpen: true,
    });
    expect(listener).toHaveBeenCalledTimes(1);
    document.removeEventListener(KEYBOARD_INSET_CHANGE_EVENT, listener);
  });
});

describe('syncVisualViewport', () => {
  it('notifies listeners when the keyboard inset changes', () => {
    const listener = jest.fn();
    document.addEventListener(KEYBOARD_INSET_CHANGE_EVENT, listener);
    const target = {
      document,
      innerHeight: 852,
      scrollX: 0,
      scrollY: 0,
      visualViewport: { height: 400, offsetTop: 0 },
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      scrollTo: jest.fn(),
    };

    syncVisualViewport(target);

    expect(listener).toHaveBeenCalledTimes(1);
    document.removeEventListener(KEYBOARD_INSET_CHANGE_EVENT, listener);
  });

  it('reduces the inset as the keyboard closes so the composer follows it', () => {
    const target = {
      document,
      innerHeight: 852,
      scrollX: 0,
      scrollY: 0,
      visualViewport: { height: 620, offsetTop: 80 },
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      scrollTo: jest.fn(),
    };

    expect(syncVisualViewport(target, true)).toMatchObject({
      height: 620,
      offsetTop: 0,
      keyboardOpen: true,
    });
  });
});

describe('bindVisualViewport', () => {
  it('updates the inset on visual viewport resize during open and close', async () => {
    const visualViewportListeners = new Map<string, EventListener>();
    const visualViewport = {
      height: 852,
      offsetTop: 0,
      addEventListener: jest.fn((type: string, listener: EventListener) => {
        visualViewportListeners.set(type, listener);
      }),
      removeEventListener: jest.fn((type: string) => {
        visualViewportListeners.delete(type);
      }),
    };
    const target = {
      document,
      innerHeight: 852,
      scrollX: 0,
      scrollY: 0,
      visualViewport,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      scrollTo: jest.fn(),
    };
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);

    const unbind = bindVisualViewport(target);
    textarea.focus();

    visualViewport.height = 400;
    visualViewportListeners.get('resize')?.(new Event('resize'));
    expect(
      document.documentElement.style.getPropertyValue('--app-height')
    ).toBe('400px');
    expect(document.documentElement.classList.contains('keyboard-open')).toBe(
      true
    );

    textarea.blur();
    visualViewport.height = 852;
    visualViewportListeners.get('resize')?.(new Event('resize'));
    await new Promise(resolve =>
      setTimeout(resolve, KEYBOARD_DISMISS_DELAY_MS + 32)
    );
    expect(
      document.documentElement.style.getPropertyValue('--app-height')
    ).toBe('852px');

    unbind();
    textarea.remove();
    expect(visualViewportListeners.size).toBe(0);
  });

  it('keeps existing content at the top instead of lifting the page from below', () => {
    const visualViewportListeners = new Map<string, EventListener>();
    const visualViewport = {
      height: 852,
      offsetTop: 0,
      addEventListener: jest.fn((type: string, listener: EventListener) => {
        visualViewportListeners.set(type, listener);
      }),
      removeEventListener: jest.fn((type: string) => {
        visualViewportListeners.delete(type);
      }),
    };
    const target = {
      document,
      innerHeight: 852,
      scrollX: 0,
      scrollY: 0,
      visualViewport,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      scrollTo: jest.fn(),
    };
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);

    const unbind = bindVisualViewport(target);
    textarea.focus();
    visualViewport.height = 400;
    visualViewportListeners.get('resize')?.(new Event('resize'));

    expect(
      document.documentElement.style.getPropertyValue('--app-height')
    ).toBe('400px');

    visualViewport.height = 380;
    visualViewportListeners.get('resize')?.(new Event('resize'));
    expect(
      document.documentElement.style.getPropertyValue('--app-height')
    ).toBe('380px');

    unbind();
    textarea.remove();
  });

  it('resets Safari pan instead of walking the shell down then back up', async () => {
    const visualViewportListeners = new Map<string, EventListener>();
    const visualViewport = {
      height: 852,
      offsetTop: 0,
      addEventListener: jest.fn((type: string, listener: EventListener) => {
        visualViewportListeners.set(type, listener);
      }),
      removeEventListener: jest.fn((type: string) => {
        visualViewportListeners.delete(type);
      }),
    };
    const target = {
      document,
      innerHeight: 852,
      scrollX: 0,
      scrollY: 0,
      visualViewport,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      scrollTo: jest.fn(),
    };
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);

    const unbind = bindVisualViewport(target, { userAgent: IPHONE_UA });
    textarea.focus();
    visualViewport.height = 351;
    visualViewport.offsetTop = 220;
    visualViewportListeners.get('resize')?.(new Event('resize'));

    expect(
      document.documentElement.style.getPropertyValue('--app-height')
    ).toBe('852px');

    await new Promise(resolve => setTimeout(resolve, 32));
    expect(
      document.documentElement.style.getPropertyValue('--app-height')
    ).toBe('852px');

    visualViewport.height = 395;
    visualViewport.offsetTop = 0;
    visualViewportListeners.get('resize')?.(new Event('resize'));
    expect(
      document.documentElement.style.getPropertyValue('--app-height')
    ).toBe('395px');
    expect(
      document.documentElement.style.getPropertyValue('--app-offset-top')
    ).toBe('0px');

    unbind();
    textarea.remove();
  });

  it('ignores Safari flashing innerHeight down and back up while the keyboard opens', async () => {
    const visualViewportListeners = new Map<string, EventListener>();
    const windowListeners = new Map<string, EventListener>();
    const visualViewport = {
      height: 619,
      offsetTop: 0,
      addEventListener: jest.fn((type: string, listener: EventListener) => {
        visualViewportListeners.set(type, listener);
      }),
      removeEventListener: jest.fn((type: string) => {
        visualViewportListeners.delete(type);
      }),
    };
    const target = {
      document,
      innerHeight: 619,
      scrollX: 0,
      scrollY: 0,
      visualViewport,
      addEventListener: jest.fn((type: string, listener: EventListener) => {
        windowListeners.set(type, listener);
      }),
      removeEventListener: jest.fn(),
      scrollTo: jest.fn(),
    };
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);

    const unbind = bindVisualViewport(target, { userAgent: IPHONE_UA });
    textarea.focus();

    target.innerHeight = 395;
    visualViewport.height = 395;
    visualViewportListeners.get('resize')?.(new Event('resize'));
    expect(
      document.documentElement.style.getPropertyValue('--app-height')
    ).toBe('619px');

    target.innerHeight = 619;
    visualViewport.height = 395;
    windowListeners.get('resize')?.(new Event('resize'));
    expect(
      document.documentElement.style.getPropertyValue('--app-height')
    ).toBe('619px');

    await new Promise(resolve =>
      setTimeout(resolve, KEYBOARD_OPEN_DELAY_MS + 16)
    );
    expect(
      document.documentElement.style.getPropertyValue('--app-height')
    ).toBe('395px');
    expect(document.documentElement.classList.contains('keyboard-open')).toBe(
      true
    );

    unbind();
    textarea.remove();
  });

  it('keeps the shell at the top while Safari pans, so the page is not dropped', () => {
    const visualViewportListeners = new Map<string, EventListener>();
    const visualViewport = {
      height: 852,
      offsetTop: 0,
      addEventListener: jest.fn((type: string, listener: EventListener) => {
        visualViewportListeners.set(type, listener);
      }),
      removeEventListener: jest.fn((type: string) => {
        visualViewportListeners.delete(type);
      }),
    };
    const target = {
      document,
      innerHeight: 852,
      scrollX: 0,
      scrollY: 0,
      visualViewport,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      scrollTo: jest.fn(),
    };
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);

    const unbind = bindVisualViewport(target);
    textarea.focus();

    visualViewport.height = 400;
    visualViewport.offsetTop = 220;
    visualViewportListeners.get('resize')?.(new Event('resize'));
    expect(
      document.documentElement.style.getPropertyValue('--app-height')
    ).toBe('400px');
    expect(
      document.documentElement.style.getPropertyValue('--app-offset-top')
    ).toBe('0px');

    visualViewport.offsetTop = 0;
    visualViewportListeners.get('scroll')?.(new Event('scroll'));
    expect(
      document.documentElement.style.getPropertyValue('--app-offset-top')
    ).toBe('0px');
    expect(
      document.documentElement.style.getPropertyValue('--app-height')
    ).toBe('400px');

    unbind();
    textarea.remove();
  });

  it('lifts the conversation when Chrome pans instead of shrinking visualViewport', () => {
    const visualViewportListeners = new Map<string, EventListener>();
    const visualViewport = {
      height: 852,
      offsetTop: 0,
      addEventListener: jest.fn((type: string, listener: EventListener) => {
        visualViewportListeners.set(type, listener);
      }),
      removeEventListener: jest.fn((type: string) => {
        visualViewportListeners.delete(type);
      }),
    };
    const target = {
      document,
      innerHeight: 852,
      scrollX: 0,
      scrollY: 0,
      visualViewport,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      scrollTo: jest.fn(),
    };
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);

    const unbind = bindVisualViewport(target);
    textarea.focus();

    visualViewport.offsetTop = 300;
    visualViewportListeners.get('scroll')?.(new Event('scroll'));
    expect(
      document.documentElement.style.getPropertyValue('--app-height')
    ).toBe('552px');
    expect(
      document.documentElement.style.getPropertyValue('--app-offset-top')
    ).toBe('0px');
    expect(document.documentElement.classList.contains('keyboard-open')).toBe(
      true
    );

    unbind();
    textarea.remove();
  });

  it('returns to rest even if Safari has not restored the viewport yet', async () => {
    const visualViewportListeners = new Map<string, EventListener>();
    const visualViewport = {
      height: 852,
      offsetTop: 0,
      addEventListener: jest.fn((type: string, listener: EventListener) => {
        visualViewportListeners.set(type, listener);
      }),
      removeEventListener: jest.fn((type: string) => {
        visualViewportListeners.delete(type);
      }),
    };
    const target = {
      document,
      innerHeight: 852,
      scrollX: 0,
      scrollY: 0,
      visualViewport,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      scrollTo: jest.fn(),
    };
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);

    const unbind = bindVisualViewport(target);
    textarea.focus();
    visualViewport.height = 400;
    visualViewportListeners.get('resize')?.(new Event('resize'));
    textarea.blur();

    await new Promise(resolve => setTimeout(resolve, KEYBOARD_DISMISS_MS + 32));

    expect(
      document.documentElement.style.getPropertyValue('--app-height')
    ).toBe('852px');
    expect(document.documentElement.classList.contains('keyboard-open')).toBe(
      false
    );

    visualViewport.height = 852;
    visualViewportListeners.get('resize')?.(new Event('resize'));

    unbind();
    textarea.remove();
  });

  it('leaves Safari alone until the dismiss animation has finished', async () => {
    const visualViewportListeners = new Map<string, EventListener>();
    const visualViewport = {
      height: 852,
      offsetTop: 0,
      addEventListener: jest.fn((type: string, listener: EventListener) => {
        visualViewportListeners.set(type, listener);
      }),
      removeEventListener: jest.fn((type: string) => {
        visualViewportListeners.delete(type);
      }),
    };
    const target = {
      document,
      innerHeight: 852,
      scrollX: 0,
      scrollY: 120,
      visualViewport,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      scrollTo: jest.fn(),
    };
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);

    const unbind = bindVisualViewport(target);
    textarea.focus();
    visualViewport.height = 400;
    visualViewportListeners.get('resize')?.(new Event('resize'));
    target.scrollTo.mockClear();
    textarea.blur();

    expect(target.scrollTo).not.toHaveBeenCalled();
    expect(
      document.documentElement.classList.contains('keyboard-dismissing')
    ).toBe(true);

    // Safari reports the closed keyboard part way through the animation, and
    // that report must not end it early.
    visualViewport.height = 852;
    visualViewportListeners.get('resize')?.(new Event('resize'));
    expect(target.scrollTo).not.toHaveBeenCalled();
    expect(
      document.documentElement.classList.contains('keyboard-dismissing')
    ).toBe(true);

    await new Promise(resolve => setTimeout(resolve, KEYBOARD_DISMISS_MS + 32));
    expect(target.scrollTo).toHaveBeenCalledWith(0, 0);
    expect(
      document.documentElement.classList.contains('keyboard-dismissing')
    ).toBe(false);

    unbind();
    textarea.remove();
  });

  it('starts interpolating to rest on blur instead of waiting for the final viewport resize', () => {
    const visualViewportListeners = new Map<string, EventListener>();
    const visualViewport = {
      height: 852,
      offsetTop: 0,
      addEventListener: jest.fn((type: string, listener: EventListener) => {
        visualViewportListeners.set(type, listener);
      }),
      removeEventListener: jest.fn((type: string) => {
        visualViewportListeners.delete(type);
      }),
    };
    const target = {
      document,
      innerHeight: 852,
      scrollX: 0,
      scrollY: 0,
      visualViewport,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      scrollTo: jest.fn(),
    };
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);

    const unbind = bindVisualViewport(target);
    textarea.focus();
    visualViewport.height = 400;
    visualViewportListeners.get('resize')?.(new Event('resize'));
    textarea.blur();

    expect(
      document.documentElement.style.getPropertyValue('--app-height')
    ).toBe('852px');
    expect(
      document.documentElement.classList.contains('keyboard-dismissing')
    ).toBe(true);
    expect(
      document.documentElement.classList.contains('keyboard-dismiss-animate')
    ).toBe(true);

    unbind();
    textarea.remove();
  });

  it('restores the lift when the composer is refocused before viewport resizes', async () => {
    const visualViewportListeners = new Map<string, EventListener>();
    const visualViewport = {
      height: 852,
      offsetTop: 0,
      addEventListener: jest.fn((type: string, listener: EventListener) => {
        visualViewportListeners.set(type, listener);
      }),
      removeEventListener: jest.fn((type: string) => {
        visualViewportListeners.delete(type);
      }),
    };
    const target = {
      document,
      innerHeight: 852,
      scrollX: 0,
      scrollY: 0,
      visualViewport,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      scrollTo: jest.fn(),
    };
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);

    const unbind = bindVisualViewport(target);
    textarea.focus();
    visualViewport.height = 400;
    visualViewportListeners.get('resize')?.(new Event('resize'));
    textarea.blur();
    textarea.focus();
    await new Promise(resolve =>
      setTimeout(resolve, KEYBOARD_OPEN_SETTLED_MS + 32)
    );

    expect(
      document.documentElement.style.getPropertyValue('--app-height')
    ).toBe('400px');
    expect(document.documentElement.classList.contains('keyboard-open')).toBe(
      true
    );
    expect(
      document.documentElement.classList.contains('keyboard-dismissing')
    ).toBe(false);

    unbind();
    textarea.remove();
  });

  it('brings the composer back up once the interrupted dismiss settles', async () => {
    const visualViewportListeners = new Map<string, EventListener>();
    const visualViewport = {
      height: 852,
      offsetTop: 0,
      addEventListener: jest.fn((type: string, listener: EventListener) => {
        visualViewportListeners.set(type, listener);
      }),
      removeEventListener: jest.fn((type: string) => {
        visualViewportListeners.delete(type);
      }),
    };
    const target = {
      document,
      innerHeight: 852,
      scrollX: 0,
      scrollY: 0,
      visualViewport,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      scrollTo: jest.fn(),
    };
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);

    const unbind = bindVisualViewport(target);
    textarea.focus();
    visualViewport.height = 400;
    visualViewportListeners.get('resize')?.(new Event('resize'));
    textarea.blur();
    await new Promise(resolve =>
      setTimeout(resolve, KEYBOARD_DISMISS_DELAY_MS)
    );
    textarea.focus();

    // Moving the composer here would cancel Safari's keyboard presentation.
    expect(
      document.documentElement.classList.contains('keyboard-dismissing')
    ).toBe(false);

    await new Promise(resolve =>
      setTimeout(resolve, KEYBOARD_OPEN_SETTLED_MS + 48)
    );

    expect(
      document.documentElement.style.getPropertyValue('--app-height')
    ).toBe('400px');
    expect(document.documentElement.classList.contains('keyboard-open')).toBe(
      true
    );

    unbind();
    textarea.remove();
  });

  it('ignores the previous keyboard sliding away when the composer is tapped again', async () => {
    const visualViewportListeners = new Map<string, EventListener>();
    const visualViewport = {
      height: 852,
      offsetTop: 0,
      addEventListener: jest.fn((type: string, listener: EventListener) => {
        visualViewportListeners.set(type, listener);
      }),
      removeEventListener: jest.fn((type: string) => {
        visualViewportListeners.delete(type);
      }),
    };
    const target = {
      document,
      innerHeight: 852,
      scrollX: 0,
      scrollY: 0,
      visualViewport,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      scrollTo: jest.fn(),
    };
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);

    const unbind = bindVisualViewport(target);
    textarea.focus();
    visualViewport.height = 400;
    visualViewportListeners.get('resize')?.(new Event('resize'));
    textarea.blur();
    await new Promise(resolve =>
      setTimeout(resolve, KEYBOARD_DISMISS_DELAY_MS)
    );

    // The composer is tapped again while Safari is still lowering the old
    // keyboard. Follow the live viewport instead of leaving a full-height page
    // for Safari to pan to the top.
    textarea.focus();
    for (const height of [500, 650, 760, 852]) {
      visualViewport.height = height;
      visualViewportListeners.get('resize')?.(new Event('resize'));
    }

    visualViewport.height = 500;
    visualViewportListeners.get('resize')?.(new Event('resize'));
    await new Promise(resolve =>
      setTimeout(resolve, KEYBOARD_OPEN_SETTLED_MS + 32)
    );
    expect(
      document.documentElement.style.getPropertyValue('--app-height')
    ).toBe('500px');
    expect(document.documentElement.classList.contains('keyboard-open')).toBe(
      true
    );

    unbind();
    textarea.remove();
  });

  it('keeps the lift through a lone closed report while the composer keeps focus', async () => {
    const visualViewportListeners = new Map<string, EventListener>();
    const visualViewport = {
      height: 852,
      offsetTop: 0,
      addEventListener: jest.fn((type: string, listener: EventListener) => {
        visualViewportListeners.set(type, listener);
      }),
      removeEventListener: jest.fn((type: string) => {
        visualViewportListeners.delete(type);
      }),
    };
    const target = {
      document,
      innerHeight: 852,
      scrollX: 0,
      scrollY: 0,
      visualViewport,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      scrollTo: jest.fn(),
    };
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);

    const unbind = bindVisualViewport(target);
    textarea.focus();
    visualViewport.height = 400;
    visualViewportListeners.get('resize')?.(new Event('resize'));
    await new Promise(resolve =>
      setTimeout(resolve, KEYBOARD_OPEN_SETTLED_MS + 32)
    );

    visualViewport.height = 852;
    visualViewportListeners.get('resize')?.(new Event('resize'));
    expect(document.documentElement.classList.contains('keyboard-open')).toBe(
      true
    );
    expect(
      document.documentElement.style.getPropertyValue('--app-height')
    ).toBe('400px');

    visualViewport.height = 400;
    visualViewportListeners.get('resize')?.(new Event('resize'));
    await new Promise(resolve =>
      setTimeout(resolve, KEYBOARD_CLOSE_CONFIRM_MS + 32)
    );
    expect(document.documentElement.classList.contains('keyboard-open')).toBe(
      true
    );
    expect(
      document.documentElement.style.getPropertyValue('--app-height')
    ).toBe('400px');

    unbind();
    textarea.remove();
  });

  it('drops the lift once the close keeps being reported', async () => {
    const visualViewportListeners = new Map<string, EventListener>();
    const visualViewport = {
      height: 852,
      offsetTop: 0,
      addEventListener: jest.fn((type: string, listener: EventListener) => {
        visualViewportListeners.set(type, listener);
      }),
      removeEventListener: jest.fn((type: string) => {
        visualViewportListeners.delete(type);
      }),
    };
    const target = {
      document,
      innerHeight: 852,
      scrollX: 0,
      scrollY: 0,
      visualViewport,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      scrollTo: jest.fn(),
    };
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);

    const unbind = bindVisualViewport(target);
    textarea.focus();
    visualViewport.height = 400;
    visualViewportListeners.get('resize')?.(new Event('resize'));

    visualViewport.height = 852;
    visualViewportListeners.get('resize')?.(new Event('resize'));
    await new Promise(resolve =>
      setTimeout(resolve, KEYBOARD_CLOSE_CONFIRM_MS + 32)
    );

    expect(document.documentElement.classList.contains('keyboard-open')).toBe(
      false
    );
    expect(document.activeElement).not.toBe(textarea);

    unbind();
    textarea.remove();
  });

  it('still animates the dismiss when the viewport is restored before it starts', async () => {
    const visualViewportListeners = new Map<string, EventListener>();
    const visualViewport = {
      height: 852,
      offsetTop: 0,
      addEventListener: jest.fn((type: string, listener: EventListener) => {
        visualViewportListeners.set(type, listener);
      }),
      removeEventListener: jest.fn((type: string) => {
        visualViewportListeners.delete(type);
      }),
    };
    const target = {
      document,
      innerHeight: 852,
      scrollX: 0,
      scrollY: 0,
      visualViewport,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      scrollTo: jest.fn(),
    };
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);

    const unbind = bindVisualViewport(target);
    textarea.focus();
    visualViewport.height = 400;
    visualViewportListeners.get('resize')?.(new Event('resize'));
    await new Promise(resolve =>
      setTimeout(resolve, KEYBOARD_OPEN_SETTLED_MS + 32)
    );

    // Safari can restore the viewport as soon as blur starts. Keep the dismiss
    // animation running instead of snapping the shell closed.
    textarea.blur();
    visualViewport.height = 852;
    visualViewportListeners.get('resize')?.(new Event('resize'));
    expect(document.documentElement.classList.contains('keyboard-open')).toBe(
      true
    );
    expect(
      document.documentElement.classList.contains('keyboard-dismissing')
    ).toBe(true);
    expect(
      document.documentElement.style.getPropertyValue('--app-height')
    ).toBe('852px');

    await new Promise(resolve => setTimeout(resolve, KEYBOARD_DISMISS_MS + 32));
    expect(document.documentElement.classList.contains('keyboard-open')).toBe(
      false
    );

    unbind();
    textarea.remove();
  });

  it('sees the keyboard of a WebView that shrinks the layout viewport', () => {
    const windowListeners = new Map<string, EventListener>();
    const visualViewport = {
      height: 852,
      offsetTop: 0,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };
    const target = {
      document,
      innerHeight: 852,
      scrollX: 0,
      scrollY: 0,
      visualViewport,
      addEventListener: jest.fn((type: string, listener: EventListener) => {
        windowListeners.set(type, listener);
      }),
      removeEventListener: jest.fn(),
      scrollTo: jest.fn(),
    };
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);

    const unbind = bindVisualViewport(target);
    textarea.focus();

    // WeChat and other in-app WebViews resize the page itself, so the visual
    // viewport never reports an occlusion of its own.
    target.innerHeight = 400;
    visualViewport.height = 400;
    windowListeners.get('resize')?.(new Event('resize'));

    expect(document.documentElement.classList.contains('keyboard-open')).toBe(
      true
    );
    expect(
      document.documentElement.style.getPropertyValue('--app-height')
    ).toBe('400px');

    unbind();
    textarea.remove();
  });

  it('shrinks the app when WeChat lowers innerHeight but not visualViewport', () => {
    const windowListeners = new Map<string, EventListener>();
    const visualViewport = {
      height: 852,
      offsetTop: 0,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };
    const target = {
      document,
      innerHeight: 852,
      scrollX: 0,
      scrollY: 0,
      visualViewport,
      addEventListener: jest.fn((type: string, listener: EventListener) => {
        windowListeners.set(type, listener);
      }),
      removeEventListener: jest.fn(),
      scrollTo: jest.fn(),
    };
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);

    const unbind = bindVisualViewport(target);
    textarea.focus();

    target.innerHeight = 400;
    windowListeners.get('resize')?.(new Event('resize'));

    expect(
      document.documentElement.style.getPropertyValue('--app-height')
    ).toBe('400px');
    expect(document.documentElement.classList.contains('keyboard-open')).toBe(
      true
    );

    unbind();
    textarea.remove();
  });

  it('follows a layout-viewport keyboard down instead of interpolating past it', () => {
    const windowListeners = new Map<string, EventListener>();
    const visualViewport = {
      height: 852,
      offsetTop: 0,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };
    const target = {
      document,
      innerHeight: 852,
      scrollX: 0,
      scrollY: 0,
      visualViewport,
      addEventListener: jest.fn((type: string, listener: EventListener) => {
        windowListeners.set(type, listener);
      }),
      removeEventListener: jest.fn(),
      scrollTo: jest.fn(),
    };
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);

    const unbind = bindVisualViewport(target);
    textarea.focus();
    target.innerHeight = 400;
    windowListeners.get('resize')?.(new Event('resize'));
    textarea.blur();

    expect(
      document.documentElement.classList.contains('keyboard-dismiss-animate')
    ).toBe(false);
    expect(
      document.documentElement.style.getPropertyValue('--app-height')
    ).toBe('400px');

    target.innerHeight = 620;
    windowListeners.get('resize')?.(new Event('resize'));
    expect(
      document.documentElement.style.getPropertyValue('--app-height')
    ).toBe('620px');

    unbind();
    textarea.remove();
  });

  it('sees the keyboard of a WebView without a visual viewport', () => {
    const windowListeners = new Map<string, EventListener>();
    const target = {
      document,
      innerHeight: 852,
      scrollX: 0,
      scrollY: 0,
      visualViewport: null,
      addEventListener: jest.fn((type: string, listener: EventListener) => {
        windowListeners.set(type, listener);
      }),
      removeEventListener: jest.fn(),
      scrollTo: jest.fn(),
    };
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);

    const unbind = bindVisualViewport(target);
    textarea.focus();

    target.innerHeight = 400;
    windowListeners.get('resize')?.(new Event('resize'));

    expect(document.documentElement.classList.contains('keyboard-open')).toBe(
      true
    );

    target.innerHeight = 852;
    textarea.blur();
    windowListeners.get('resize')?.(new Event('resize'));

    unbind();
    textarea.remove();
  });

  it('blurs the home composer when the user scrolls the page', () => {
    const visualViewportListeners = new Map<string, EventListener>();
    const visualViewport = {
      height: 852,
      offsetTop: 0,
      addEventListener: jest.fn((type: string, listener: EventListener) => {
        visualViewportListeners.set(type, listener);
      }),
      removeEventListener: jest.fn((type: string) => {
        visualViewportListeners.delete(type);
      }),
    };
    const target = {
      document,
      innerHeight: 852,
      scrollX: 0,
      scrollY: 0,
      visualViewport,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      scrollTo: jest.fn(),
    };
    const home = document.createElement('div');
    home.setAttribute('data-chat-home', '');
    const textarea = document.createElement('textarea');
    home.appendChild(textarea);
    document.body.appendChild(home);

    const unbind = bindVisualViewport(target);
    textarea.focus();
    visualViewport.height = 400;
    visualViewportListeners.get('resize')?.(new Event('resize'));

    home.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    home.dispatchEvent(new Event('scroll'));

    expect(document.activeElement).not.toBe(textarea);

    unbind();
    home.remove();
  });
});
