/** @jest-environment jsdom */
import { act, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { behavior, configureBehaviorTracking } from '@/lib/behaviorTracking';

import ThinkingLevelSelector from './ThinkingLevelSelector';
import type { ThinkingConfig } from './useThinkingLevel';

jest.mock('./thinkingLevelSelector.css', () => ({}));
jest.mock('@/lib/request', () => ({ http: { get: jest.fn() } }));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('@/components/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => children,
  Tooltip: ({ children }: { children: React.ReactNode }) => children,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => children,
  TooltipContent: () => null,
}));

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
const config: ThinkingConfig = {
  default: {
    default: { edition: 'pro', level: 'medium' },
    levels: [
      { edition: 'pro', level: 'medium' },
      { edition: 'pro', level: 'high' },
    ],
  },
};

it('reports the actual Radix panel once per visible opening, not per model or strength render', async () => {
  const observerDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    'IntersectionObserver'
  );
  const resizeDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    'ResizeObserver'
  );
  let visible = false;
  let focused = true;
  const observers = new Set<() => void>();
  Object.defineProperty(globalThis, 'IntersectionObserver', {
    configurable: true,
    value: class {
      notify = () => {};
      constructor(private callback: IntersectionObserverCallback) {}
      observe(target: Element) {
        this.notify = () =>
          this.callback(
            [
              {
                isIntersecting: visible,
                intersectionRatio: visible ? 1 : 0,
                target,
              } as IntersectionObserverEntry,
            ],
            this as unknown as IntersectionObserver
          );
        observers.add(this.notify);
        this.notify();
      }
      disconnect() {
        observers.delete(this.notify);
      }
    },
  });
  Object.defineProperty(globalThis, 'ResizeObserver', {
    configurable: true,
    value: class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  });
  jest.spyOn(document, 'hasFocus').mockImplementation(() => focused);
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    value: 'visible',
  });
  localStorage.setItem('uid', 'panel-user');
  const send = jest.fn<Promise<void>, [string, Record<string, unknown>]>(() =>
    Promise.resolve()
  );
  configureBehaviorTracking(true, send);
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  const render = (level = 'medium', disabled = false) =>
    root.render(
      <StrictMode>
        <ThinkingLevelSelector
          config={config}
          group="default"
          value={{ edition: 'pro', level }}
          onChange={() => {}}
          onGroupChange={() => {}}
          disabled={disabled}
        />
      </StrictMode>
    );
  const trigger = () =>
    host.querySelector<HTMLButtonElement>(
      'button[aria-label^="chat.thinking_level"]'
    )!;
  const exposures = () =>
    send.mock.calls.filter(
      ([name, props]) =>
        name === 'ui_exposure' && props.target === 'model_strength_panel'
    );
  try {
    await act(async () => render());
    await act(async () => trigger().focus());
    expect(exposures()).toHaveLength(0);
    await act(async () => trigger().click());
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    expect(exposures()).toHaveLength(0);
    await act(async () => {
      visible = true;
      observers.forEach(notify => notify());
    });
    expect(exposures()).toHaveLength(1);
    expect(exposures()[0][1]).toMatchObject({
      scope: 'surface',
      schema_version: 1,
    });
    await act(async () => render('high'));
    await act(async () =>
      document
        .querySelector<HTMLButtonElement>(
          'button[aria-label="chat.model_tier"]'
        )!
        .click()
    );
    expect(exposures()).toHaveLength(1);
    await act(async () => trigger().click());
    await act(async () => trigger().click());
    expect(exposures()).toHaveLength(2);
    expect(exposures()[0][1].exposure_id).not.toBe(
      exposures()[1][1].exposure_id
    );
    await act(async () => {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value: 'hidden',
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(exposures()).toHaveLength(2);
    await act(async () => {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        value: 'visible',
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(exposures()).toHaveLength(3);
    await act(async () => {
      focused = false;
      window.dispatchEvent(new Event('blur'));
    });
    expect(exposures()).toHaveLength(3);
    await act(async () => {
      focused = true;
      window.dispatchEvent(new Event('focus'));
    });
    expect(exposures()).toHaveLength(4);
    await act(async () => trigger().click());
    await act(async () => render('high', true));
    await act(async () => trigger().click());
    expect(exposures()).toHaveLength(4);
  } finally {
    await act(async () => root.unmount());
    host.remove();
    configureBehaviorTracking(false, async () => {});
    behavior.visits.forEach(visit => visit.discard());
    jest.restoreAllMocks();
    if (observerDescriptor)
      Object.defineProperty(
        globalThis,
        'IntersectionObserver',
        observerDescriptor
      );
    else Reflect.deleteProperty(globalThis, 'IntersectionObserver');
    if (resizeDescriptor)
      Object.defineProperty(globalThis, 'ResizeObserver', resizeDescriptor);
    else Reflect.deleteProperty(globalThis, 'ResizeObserver');
  }
});
