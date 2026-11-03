/** @jest-environment jsdom */

import { act, createElement } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import type { Application } from '@/interface';

import { useBindingStatusPolling } from './useBindingStatusPolling';

jest.mock('@/const', () => ({ BIND_CHECK_INTERVAL: 3000 }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

type Options = Parameters<typeof useBindingStatusPolling>[0];

function application(bound = false): Application {
  return {
    id: 'application-1',
    namespace_id: 'namespace-1',
    user_id: 'user-1',
    app_id: 'wechat_oa_bot',
    ...(bound ? { api_key_id: 'api-key-1' } : {}),
  };
}

function deferred() {
  let resolve!: (value: Application) => void;
  const promise = new Promise<Application>(done => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('useBindingStatusPolling', () => {
  let root: Root;
  let options: Options;
  let check: jest.Mock;
  let complete: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
    root = createRoot(document.createElement('div'));
    check = jest.fn().mockResolvedValue(application());
    complete = jest.fn();
    options = {
      open: true,
      applicationId: 'application-1',
      checkApplicationStatus: check,
      onBindingComplete: complete,
    };
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    jest.useRealTimers();
  });

  function Probe(props: Options) {
    useBindingStatusPolling(props);
    return null;
  }

  async function render(changes: Partial<Options> = {}) {
    options = { ...options, ...changes };
    await act(async () => root.render(createElement(Probe, options)));
  }

  async function advance(ms = 3000) {
    await act(async () => {
      await jest.advanceTimersByTimeAsync(ms);
    });
  }

  async function visibility(value: DocumentVisibilityState) {
    await act(async () => {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });
  }

  it('polls with a cancellation signal and completes once per open session', async () => {
    check.mockResolvedValue(application(true));
    await render();
    await advance();
    expect(check).toHaveBeenCalledWith('application-1', {
      signal: expect.any(AbortSignal),
    });
    expect(complete).toHaveBeenCalledTimes(1);
    await render({ onBindingComplete: jest.fn() });
    await visibility('hidden');
    await visibility('visible');
    await advance(9000);
    expect(check).toHaveBeenCalledTimes(1);
    await render({ open: false });
    await render({ open: true, onBindingComplete: complete });
    await advance();
    expect(complete).toHaveBeenCalledTimes(2);
  });

  it.each([{ open: false }, { active: false }, { applicationId: '' }])(
    'does not query while disabled: %j',
    async disabled => {
      await render(disabled);
      await advance(9000);
      expect(check).not.toHaveBeenCalled();
    }
  );

  it('waits while hidden and queries immediately on visibility return', async () => {
    await visibility('hidden');
    await render();
    await advance(9000);
    expect(check).not.toHaveBeenCalled();
    await visibility('visible');
    expect(check).toHaveBeenCalledTimes(1);
  });

  it('cancels hidden requests and ignores their late success after resuming', async () => {
    const pending = deferred();
    check.mockReturnValueOnce(pending.promise);
    await render();
    await advance();
    expect(check).toHaveBeenCalledTimes(1);
    const signal = check.mock.calls[0][1].signal as AbortSignal;
    await visibility('hidden');
    expect(signal.aborted).toBe(true);
    await advance(9000);
    expect(check).toHaveBeenCalledTimes(1);
    await visibility('visible');
    expect(check).toHaveBeenCalledTimes(2);
    await act(async () => pending.resolve(application(true)));
    expect(complete).not.toHaveBeenCalled();
  });

  it.each(['close', 'inactive', 'identity', 'checker', 'unmount'])(
    'cancels and ignores late completion on %s',
    async change => {
      const pending = deferred();
      check.mockReturnValueOnce(pending.promise);
      await render();
      await advance();
      expect(check).toHaveBeenCalledTimes(1);
      const signal = check.mock.calls[0][1].signal as AbortSignal;
      if (change === 'close') await render({ open: false });
      if (change === 'inactive') await render({ active: false });
      if (change === 'identity')
        await render({ applicationId: 'application-2' });
      if (change === 'checker')
        await render({
          checkApplicationStatus: jest.fn().mockResolvedValue(application()),
        });
      if (change === 'unmount') await act(async () => root.render(null));
      expect(signal.aborted).toBe(true);
      await act(async () => pending.resolve(application(true)));
      expect(complete).not.toHaveBeenCalled();
    }
  );

  it('does not overlap slow requests even on focus', async () => {
    const pending = deferred();
    check.mockReturnValueOnce(pending.promise);
    await render();
    await advance(12000);
    await act(async () => window.dispatchEvent(new Event('focus')));
    expect(check).toHaveBeenCalledTimes(1);
    await act(async () => pending.resolve(application()));
    await advance();
    expect(check).toHaveBeenCalledTimes(2);
  });

  it('calibrates immediately on focus and continues after transient errors', async () => {
    check.mockRejectedValueOnce(new Error('offline'));
    await render();
    await act(async () => window.dispatchEvent(new Event('focus')));
    expect(check).toHaveBeenCalledTimes(1);
    await advance();
    expect(check).toHaveBeenCalledTimes(2);
  });

  it('keeps the five-minute deadline across callback rerenders and visibility changes', async () => {
    await render();
    await advance(240000);
    expect(check).toHaveBeenCalled();
    await render({ onBindingComplete: jest.fn() });
    await visibility('hidden');
    await advance(61000);
    const previousCount = check.mock.calls.length;
    await visibility('visible');
    await advance(9000);
    expect(check).toHaveBeenCalledTimes(previousCount);
  });

  it('preserves completion when the checker changes in the same session', async () => {
    check.mockResolvedValue(application(true));
    await render();
    await advance();
    const replacement = jest.fn().mockResolvedValue(application(true));
    await render({ checkApplicationStatus: replacement });
    await advance();
    expect(replacement).not.toHaveBeenCalled();
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('preserves the deadline when the checker changes in the same session', async () => {
    await render();
    await advance(299000);
    const replacement = jest.fn().mockResolvedValue(application());
    await render({ checkApplicationStatus: replacement });
    await advance(10000);
    expect(replacement).not.toHaveBeenCalled();
  });

  it('aborts a slow request when the five-minute deadline expires', async () => {
    const pending = deferred();
    check.mockReturnValueOnce(pending.promise);
    await render();
    await advance();
    expect(check).toHaveBeenCalledTimes(1);
    const signal = check.mock.calls[0][1].signal as AbortSignal;
    await advance(297000);
    expect(signal.aborted).toBe(true);
    await act(async () => pending.resolve(application(true)));
    expect(complete).not.toHaveBeenCalled();
  });
});
