/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { toast } from 'sonner';

import {
  type AliyunCaptchaInitOptions,
  ensureAliyunCaptchaScript,
  loadCaptchaConfig,
} from '@/lib/captcha';

import { type CaptchaController, useCaptcha } from './useCaptcha';

jest.mock('@/lib/captcha', () => ({
  ALIYUN_CAPTCHA_NODE_SELECTOR:
    '[id*="aliyunCaptcha" i],[class*="aliyunCaptcha" i]',
  loadCaptchaConfig: jest.fn(),
  ensureAliyunCaptchaScript: jest.fn(),
  toCaptchaLanguage: () => 'en',
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ i18n: { language: 'en' }, t: (key: string) => key }),
}));

jest.mock('sonner', () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('useCaptcha run()', () => {
  let container: HTMLDivElement;
  let root: Root;
  let current: CaptchaController;
  let initOptions: AliyunCaptchaInitOptions | null;
  let clicks: number;
  // Set when the fake SDK should report an instance, i.e. when it is ready.
  let instanceDelayMs: number | null;

  function Probe() {
    current = useCaptcha({ scene: 'web', mode: 'popup' });
    return <div id={current.mountId} />;
  }

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    initOptions = null;
    clicks = 0;
    instanceDelayMs = 0;
    (loadCaptchaConfig as jest.Mock).mockResolvedValue({
      enabled: true,
      prefix: 'prefix',
      region: 'cn',
      scene_ids: { web: 'scene-web', app: 'scene-app' },
    });
    (ensureAliyunCaptchaScript as jest.Mock).mockResolvedValue(undefined);
    window.initAliyunCaptcha = (options: AliyunCaptchaInitOptions) => {
      initOptions = options;
      const button = document.querySelector<HTMLButtonElement>(
        options.button as string
      );
      // The real SDK only binds its handler once its challenge bundle has
      // loaded, and announces that by calling `getInstance`.
      button?.addEventListener('click', () => {
        clicks += 1;
      });
      if (instanceDelayMs !== null) {
        window.setTimeout(() => options.getInstance({}), instanceDelayMs);
      }
    };
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    delete window.initAliyunCaptcha;
    jest.useRealTimers();
  });

  /**
   * Append an SDK node the way the real popup mode does: on <body>, with a
   * controllable visibility (the SDK hides rather than removes its nodes).
   */
  function appendCaptchaNode(visible: boolean) {
    const node = document.createElement('div');
    node.id = 'aliyunCaptcha-window-popup';
    const state = { visible };
    Object.defineProperty(node, 'getClientRects', {
      value: () => (state.visible ? [{}] : []),
    });
    document.body.appendChild(node);
    return {
      node,
      show: () => {
        state.visible = true;
        node.setAttribute('style', 'display: block');
      },
    };
  }

  async function mountReady() {
    await act(async () => root.render(<Probe />));
    await act(async () => {
      await Promise.resolve();
    });
    expect(current.ready).toBe(true);
  }

  it('waits for the SDK instance before clicking the trigger', async () => {
    instanceDelayMs = 2000;
    await mountReady();

    const onVerify = jest.fn().mockResolvedValue({ captchaResult: true });
    let settled = false;
    await act(async () => {
      void current.run(onVerify).then(() => {
        settled = true;
      });
    });

    // Our own trigger exists already, but the SDK has not reported readiness.
    expect(document.getElementById(current.buttonId)).not.toBeNull();
    await act(async () => {
      await jest.advanceTimersByTimeAsync(1500);
    });
    expect(clicks).toBe(0);
    expect(current.running).toBe(true);
    expect(settled).toBe(false);

    await act(async () => {
      await jest.advanceTimersByTimeAsync(1000);
    });
    expect(clicks).toBe(1);
    expect(onVerify).not.toHaveBeenCalled();
  });

  it('settles the run when the SDK swallows the clicks', async () => {
    await mountReady();

    const onVerify = jest.fn().mockResolvedValue({ captchaResult: true });
    let result: Awaited<ReturnType<CaptchaController['run']>> | null = null;
    await act(async () => {
      void current.run(onVerify).then(value => {
        result = value;
      });
    });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(100);
    });
    expect(clicks).toBe(1);
    expect(current.running).toBe(true);

    // First watchdog window: no popup and no callback, so click once more.
    await act(async () => {
      await jest.advanceTimersByTimeAsync(3600);
    });
    expect(clicks).toBe(2);
    expect(result).toBeNull();

    // Second watchdog window: give up instead of hanging the caller.
    await act(async () => {
      await jest.advanceTimersByTimeAsync(3600);
    });
    expect(result).toEqual({
      captchaResult: false,
      bizResult: false,
      cancelled: true,
    });
    expect(current.running).toBe(false);
    expect(onVerify).not.toHaveBeenCalled();
  });

  it('cancels the run when the SDK hides its popup instead of removing it', async () => {
    await mountReady();

    const onVerify = jest.fn();
    let result: Awaited<ReturnType<CaptchaController['run']>> | null = null;
    await act(async () => {
      void current.run(onVerify).then(value => {
        result = value;
      });
    });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(100);
    });

    // The SDK opens its challenge on <body>.
    const popup = document.createElement('div');
    popup.id = 'aliyunCaptcha-window-popup';
    let visible = true;
    Object.defineProperty(popup, 'getClientRects', {
      value: () => (visible ? [{}] : []),
    });
    document.body.appendChild(popup);

    await act(async () => {
      await jest.advanceTimersByTimeAsync(8000);
    });
    // An open popup disarms the watchdog and keeps the run alive.
    expect(clicks).toBe(1);
    expect(result).toBeNull();
    expect(current.running).toBe(true);

    // The SDK's own close button only hides the node, it does not remove it.
    visible = false;
    await act(async () => {
      await jest.advanceTimersByTimeAsync(1000);
    });
    expect(result).toEqual({
      captchaResult: false,
      bizResult: false,
      cancelled: true,
    });
    expect(current.running).toBe(false);
    popup.remove();
  });

  it('leaves the run to the SDK once the captcha callback fires', async () => {
    await mountReady();

    const onVerify = jest.fn().mockResolvedValue({ captchaResult: true });
    let result: Awaited<ReturnType<CaptchaController['run']>> | null = null;
    await act(async () => {
      void current.run(onVerify).then(value => {
        result = value;
      });
    });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(100);
    });
    expect(clicks).toBe(1);

    await act(async () => {
      await initOptions!.captchaVerifyCallback('param');
    });
    expect(onVerify).toHaveBeenCalledWith('param');
    expect(result).toEqual({ captchaResult: true });

    // The watchdog must not fire a second click after a successful run.
    await act(async () => {
      await jest.advanceTimersByTimeAsync(8000);
    });
    expect(clicks).toBe(1);
  });

  it('sends without a param when the SDK never reports an instance', async () => {
    instanceDelayMs = null;
    await mountReady();

    const onVerify = jest
      .fn()
      .mockResolvedValue({ captchaResult: true, bizResult: true });
    let result: Awaited<ReturnType<CaptchaController['run']>> | null = null;
    await act(async () => {
      void current.run(onVerify).then(value => {
        result = value;
      });
    });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(6000);
    });
    expect(clicks).toBe(0);
    expect(onVerify).toHaveBeenCalledWith(undefined);
    expect(result).toEqual({ captchaResult: true, bizResult: true });
    expect(current.running).toBe(false);
  });

  it('keeps waiting for a challenge that paints after the watchdog window', async () => {
    await mountReady();

    const onVerify = jest
      .fn()
      .mockResolvedValue({ captchaResult: true, bizResult: true });
    let result: Awaited<ReturnType<CaptchaController['run']>> | null = null;
    await act(async () => {
      void current.run(onVerify).then(value => {
        result = value;
      });
    });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(100);
    });
    expect(clicks).toBe(1);

    // Slow connection: the SDK attaches its challenge but has not painted it.
    const popup = appendCaptchaNode(false);
    await act(async () => {
      await jest.advanceTimersByTimeAsync(4000);
    });
    // That is a sign of life: no second click, and the run stays alive.
    expect(clicks).toBe(1);
    expect(result).toBeNull();
    expect(current.running).toBe(true);

    await act(async () => {
      await jest.advanceTimersByTimeAsync(8000);
    });
    expect(clicks).toBe(1);
    expect(result).toBeNull();

    // The challenge finally paints and the user solves it.
    popup.show();
    await act(async () => {
      await jest.advanceTimersByTimeAsync(300);
    });
    await act(async () => {
      await initOptions!.captchaVerifyCallback('param');
    });
    expect(onVerify).toHaveBeenCalledWith('param');
    expect(result).toEqual({ captchaResult: true, bizResult: true });
    popup.node.remove();
  });

  it('still sends when a solve arrives after the run was abandoned', async () => {
    await mountReady();

    const onVerify = jest
      .fn()
      .mockResolvedValue({ captchaResult: true, bizResult: true });
    let result: Awaited<ReturnType<CaptchaController['run']>> | null = null;
    await act(async () => {
      void current.run(onVerify).then(value => {
        result = value;
      });
    });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(100);
    });
    const popup = appendCaptchaNode(false);

    // A challenge that never paints is abandoned at the stall deadline, with a
    // message, so the form cannot deadlock.
    await act(async () => {
      await jest.advanceTimersByTimeAsync(35000);
    });
    expect(result).toEqual({
      captchaResult: false,
      bizResult: false,
      cancelled: true,
    });
    expect(current.running).toBe(false);
    expect(toast.error).toHaveBeenCalledWith(
      'captcha.unavailable',
      expect.anything()
    );

    // The popup shows up late and the user solves it: the send must still run
    // instead of the SDK being told "all good" while nothing happens.
    popup.show();
    let sdkResult: unknown = null;
    await act(async () => {
      sdkResult = await initOptions!.captchaVerifyCallback('late-param');
    });
    expect(onVerify).toHaveBeenCalledWith('late-param');
    expect(sdkResult).toEqual({ captchaResult: true, bizResult: true });
    popup.node.remove();
  });

  it('stops refreshing after repeated rejections and reports the reason', async () => {
    await mountReady();

    const onVerify = jest.fn().mockResolvedValue({
      captchaResult: false,
      bizResult: false,
      message: 'Captcha verification failed, please try again',
    });
    let result: Awaited<ReturnType<CaptchaController['run']>> | null = null;
    await act(async () => {
      void current.run(onVerify).then(value => {
        result = value;
      });
    });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(100);
    });

    // The first two rejections refresh the challenge and keep the run alive.
    for (const attempt of [1, 2]) {
      let sdkResult: unknown = null;
      await act(async () => {
        sdkResult = await initOptions!.captchaVerifyCallback(
          `param-${attempt}`
        );
      });
      expect(sdkResult).toEqual({ captchaResult: false, bizResult: false });
      expect(result).toBeNull();
      expect(current.running).toBe(true);
    }

    // The third tells the SDK to close instead of looping forever, settles the
    // run and surfaces the server's message.
    let sdkResult: unknown = null;
    await act(async () => {
      sdkResult = await initOptions!.captchaVerifyCallback('param-3');
    });
    expect(sdkResult).toEqual({ captchaResult: true, bizResult: false });
    expect(onVerify).toHaveBeenCalledTimes(3);
    expect(result).toEqual({
      captchaResult: false,
      bizResult: false,
      message: 'Captcha verification failed, please try again',
    });
    expect(current.running).toBe(false);
    expect(toast.error).toHaveBeenCalledWith(
      'Captcha verification failed, please try again',
      expect.anything()
    );
  });
});
