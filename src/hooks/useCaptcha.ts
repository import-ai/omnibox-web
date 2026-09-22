import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import {
  type AliyunCaptchaInstance,
  type CaptchaMode,
  type CaptchaScene,
  type CaptchaVerifyResult,
  ensureAliyunCaptchaScript,
  loadCaptchaConfig,
  toCaptchaLanguage,
} from '@/lib/captcha';

export type CaptchaStatus = 'loading' | 'ready' | 'disabled' | 'error';
export type CaptchaErrorKind = 'config' | 'script';

/**
 * Sends the protected request. `captchaVerifyParam` is undefined when the
 * captcha is disabled or unavailable on the client (fail open; the server
 * still enforces it). Put the caller's loading state inside this handler:
 * it is the only part guaranteed to run once per real attempt.
 */
export type CaptchaVerifyHandler = (
  captchaVerifyParam?: string
) => Promise<CaptchaVerifyResult>;

export interface CaptchaRunResult extends CaptchaVerifyResult {
  // The popup was dismissed without a verification, so the handler never ran.
  cancelled?: boolean;
}

export interface UseCaptchaOptions {
  scene: CaptchaScene;
  mode: CaptchaMode;
  slideStyle?: { width: number; height: number };
  // Embed mode: invoked when the user completes the inline widget without a
  // `run()` in flight (the H5 page for the mobile app).
  onVerify?: CaptchaVerifyHandler;
}

export interface CaptchaController {
  status: CaptchaStatus;
  mode: CaptchaMode;
  // Config says captcha is on and the SDK is (being) loaded.
  enabled: boolean;
  // The SDK is initialised and bound to this instance's mount.
  ready: boolean;
  error?: CaptchaErrorKind;
  // Id of the React-owned wrapper rendered by <CaptchaMount />.
  mountId: string;
  elementId: string;
  buttonId: string;
  run: (onVerify: CaptchaVerifyHandler) => Promise<CaptchaRunResult>;
}

interface PendingRun {
  onVerify: CaptchaVerifyHandler;
  resolve: (result: CaptchaRunResult) => void;
}

const DEFAULT_SLIDE_STYLE = { width: 360, height: 40 };
// Give the SDK time to close its popup before a fresh init.
const REINIT_DELAY_MS = 300;
// Debounce popup removal: the SDK may drop and re-append nodes on refresh.
const CANCEL_CHECK_DELAY_MS = 250;
const CANCELLED_RESULT: CaptchaRunResult = {
  captchaResult: false,
  bizResult: false,
  cancelled: true,
};

function isCaptchaPopupNode(node: Node): boolean {
  if (!(node instanceof HTMLElement)) {
    return false;
  }
  const id = node.id || '';
  const className = typeof node.className === 'string' ? node.className : '';
  return (
    id.toLowerCase().includes('aliyuncaptcha') ||
    className.toLowerCase().includes('aliyuncaptcha')
  );
}

function hasCaptchaPopup(): boolean {
  return Array.from(document.body.children).some(isCaptchaPopupNode);
}

function createHiddenButton(id: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.id = id;
  button.tabIndex = -1;
  button.setAttribute('aria-hidden', 'true');
  Object.assign(button.style, {
    position: 'absolute',
    left: '-9999px',
    width: '1px',
    height: '1px',
    padding: '0',
    border: '0',
    overflow: 'hidden',
    opacity: '0',
  });
  return button;
}

export function useCaptcha(options: UseCaptchaOptions): CaptchaController {
  const { scene, mode, slideStyle, onVerify: embedVerify } = options;
  const slideWidth = slideStyle?.width ?? DEFAULT_SLIDE_STYLE.width;
  const slideHeight = slideStyle?.height ?? DEFAULT_SLIDE_STYLE.height;
  const { i18n } = useTranslation();
  const language = toCaptchaLanguage(i18n.language);

  const reactId = useId();
  const ids = useMemo(() => {
    const base = `captcha-${reactId.replace(/[^A-Za-z0-9_-]/g, '')}`;
    return {
      mountId: `${base}-mount`,
      elementId: `${base}-element`,
      buttonId: `${base}-button`,
    };
  }, [reactId]);

  const [status, setStatus] = useState<CaptchaStatus>('loading');
  const [error, setError] = useState<CaptchaErrorKind | undefined>();
  const [configEnabled, setConfigEnabled] = useState(false);
  // Bumped after every finished verification: one SDK lifecycle per round.
  const [round, setRound] = useState(0);

  const mountedRef = useRef(true);
  const statusRef = useRef<CaptchaStatus>('loading');
  const setupRef = useRef<Promise<void>>(Promise.resolve());
  const sceneIdRef = useRef('');
  const instanceRef = useRef<AliyunCaptchaInstance | null>(null);
  const pendingRef = useRef<PendingRun | null>(null);
  const observerRef = useRef<MutationObserver | null>(null);
  const cancelTimerRef = useRef<number | null>(null);
  const embedVerifyRef = useRef(embedVerify);
  embedVerifyRef.current = embedVerify;

  const stopObserver = useCallback(() => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (cancelTimerRef.current !== null) {
      window.clearTimeout(cancelTimerRef.current);
      cancelTimerRef.current = null;
    }
  }, []);

  const finishRound = useCallback(() => {
    window.setTimeout(() => {
      if (mountedRef.current) {
        setRound(value => value + 1);
      }
    }, REINIT_DELAY_MS);
  }, []);

  const cancelPending = useCallback(() => {
    const pending = pendingRef.current;
    if (!pending) {
      return;
    }
    pendingRef.current = null;
    stopObserver();
    pending.resolve(CANCELLED_RESULT);
    finishRound();
  }, [finishRound, stopObserver]);

  // Popup mode gives no callback when the user closes the dialog. Watch the
  // SDK's popup nodes on <body>; when they are gone and nothing replaced them
  // shortly after, the run is resolved as cancelled.
  const startObserver = useCallback(() => {
    stopObserver();
    const observer = new MutationObserver(records => {
      const removedPopup = records.some(record =>
        Array.from(record.removedNodes).some(isCaptchaPopupNode)
      );
      if (!removedPopup || cancelTimerRef.current !== null) {
        return;
      }
      cancelTimerRef.current = window.setTimeout(() => {
        cancelTimerRef.current = null;
        if (pendingRef.current && !hasCaptchaPopup()) {
          cancelPending();
        }
      }, CANCEL_CHECK_DELAY_MS);
    });
    observer.observe(document.body, { childList: true });
    observerRef.current = observer;
  }, [cancelPending, stopObserver]);

  // Load config + SDK once per mount.
  useEffect(() => {
    mountedRef.current = true;
    const update = (next: CaptchaStatus, kind?: CaptchaErrorKind) => {
      statusRef.current = next;
      if (mountedRef.current) {
        setStatus(next);
        setError(kind);
      }
    };
    setupRef.current = (async () => {
      let config;
      try {
        config = await loadCaptchaConfig();
      } catch {
        update('error', 'config');
        return;
      }
      const sceneId = config.scene_ids[scene];
      if (!config.enabled || !sceneId) {
        update('disabled');
        return;
      }
      sceneIdRef.current = sceneId;
      if (mountedRef.current) {
        setConfigEnabled(true);
      }
      try {
        await ensureAliyunCaptchaScript(config.prefix, config.region);
      } catch {
        update('error', 'script');
        return;
      }
      update('ready');
    })();
    return () => {
      mountedRef.current = false;
      stopObserver();
      pendingRef.current?.resolve(CANCELLED_RESULT);
      pendingRef.current = null;
    };
  }, [scene, stopObserver]);

  // (Re)initialise the SDK for the current round with fresh DOM nodes.
  useEffect(() => {
    if (status !== 'ready') {
      return;
    }
    const mount = document.getElementById(ids.mountId);
    const init = window.initAliyunCaptcha;
    if (!mount || typeof init !== 'function') {
      return;
    }
    mount.innerHTML = '';
    const element = document.createElement('div');
    element.id = ids.elementId;
    mount.appendChild(element);
    // The SDK dereferences `button` in embed mode too (initEmbed throws and
    // leaves the widget unsized without it), so always provide one.
    mount.appendChild(createHiddenButton(ids.buttonId));

    const captchaVerifyCallback = async (
      captchaVerifyParam: string
    ): Promise<CaptchaVerifyResult> => {
      const pending = pendingRef.current;
      pendingRef.current = null;
      stopObserver();
      const handler = pending?.onVerify ?? embedVerifyRef.current;
      let result: CaptchaVerifyResult;
      try {
        result = handler
          ? await handler(captchaVerifyParam)
          : { captchaResult: true, bizResult: false };
      } catch {
        result = { captchaResult: true, bizResult: false };
      }
      if (!result.captchaResult) {
        // The SDK refreshes the challenge; keep waiting for the retry.
        if (pending) {
          pendingRef.current = pending;
          startObserver();
        }
        return result;
      }
      pending?.resolve(result);
      finishRound();
      return result;
    };

    try {
      init({
        SceneId: sceneIdRef.current,
        mode,
        element: `#${ids.elementId}`,
        button: `#${ids.buttonId}`,
        // Embed mode only collects the slide until the button is clicked;
        // nothing clicks it on the H5 page, so verify as soon as it completes.
        immediate: mode === 'embed',
        captchaVerifyCallback,
        onBizResultCallback: () => {},
        getInstance: instance => {
          instanceRef.current = instance;
        },
        slideStyle: { width: slideWidth, height: slideHeight },
        language,
      });
    } catch (err) {
      console.error('Failed to initialise Aliyun captcha', err);
    }

    return () => {
      instanceRef.current = null;
      mount.innerHTML = '';
    };
  }, [
    finishRound,
    ids,
    language,
    mode,
    round,
    slideHeight,
    slideWidth,
    startObserver,
    status,
    stopObserver,
  ]);

  const run = useCallback(
    async (onVerify: CaptchaVerifyHandler): Promise<CaptchaRunResult> => {
      await setupRef.current;
      const button =
        statusRef.current === 'ready' && mode === 'popup'
          ? document.getElementById(ids.buttonId)
          : null;
      if (!button) {
        // Disabled, failed to load, or embed mode: send without a param.
        return onVerify(undefined);
      }
      // A previous run whose popup was dismissed without detection is
      // superseded by this one.
      pendingRef.current?.resolve(CANCELLED_RESULT);
      return new Promise<CaptchaRunResult>(resolve => {
        pendingRef.current = { onVerify, resolve };
        startObserver();
        button.click();
      });
    },
    [ids.buttonId, mode, startObserver]
  );

  return {
    status,
    mode,
    enabled: configEnabled,
    ready: status === 'ready',
    error,
    mountId: ids.mountId,
    elementId: ids.elementId,
    buttonId: ids.buttonId,
    run,
  };
}
