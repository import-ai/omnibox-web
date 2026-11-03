/** @jest-environment jsdom */
import { act, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { track } from '@/lib/sendTrackEvent';

import {
  inviteEntryOnScreen,
  useInviteReferralEntryExposure,
} from './useInviteReferralEntryExposure';

jest.mock('@/lib/sendTrackEvent', () => ({ track: jest.fn() }));

let callback: IntersectionObserverCallback;
let disconnect: jest.Mock;
let container: HTMLDivElement;
let root: Root;
let visibility: DocumentVisibilityState;
const mockedTrack = jest.mocked(track);

function Entry({
  enabled = true,
  pathname = '/namespace/chat',
}: {
  enabled?: boolean;
  pathname?: string;
}) {
  const ref = useInviteReferralEntryExposure(enabled, pathname);
  return <div ref={ref} />;
}

function intersect(visible: boolean) {
  act(() => {
    callback(
      [
        {
          target: container.firstElementChild,
          isIntersecting: visible,
          intersectionRatio: visible ? 1 : 0,
        } as IntersectionObserverEntry,
      ],
      {} as IntersectionObserver
    );
  });
}

function setVisibility(value: DocumentVisibilityState) {
  act(() => {
    visibility = value;
    document.dispatchEvent(new Event('visibilitychange'));
  });
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  visibility = 'visible';
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => visibility,
  });
  disconnect = jest.fn();
  globalThis.IntersectionObserver = jest.fn(cb => {
    callback = cb;
    return { observe: jest.fn(), disconnect };
  }) as unknown as typeof IntersectionObserver;
  mockedTrack.mockClear();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

test('counts visibility transitions, not renders or repeated observer callbacks', () => {
  act(() => root.render(<Entry />));
  expect(mockedTrack).not.toHaveBeenCalled();
  intersect(true);
  intersect(true);
  act(() => root.render(<Entry />));
  expect(mockedTrack).toHaveBeenCalledTimes(1);
  intersect(false);
  intersect(true);
  expect(mockedTrack).toHaveBeenCalledTimes(2);
  expect(mockedTrack).toHaveBeenLastCalledWith(
    'invite_referral_home_entry_view',
    { platform: 'web' }
  );
});

test('excludes hidden tabs and counts the entry when the tab becomes visible', () => {
  setVisibility('hidden');
  act(() => root.render(<Entry />));
  intersect(true);
  expect(mockedTrack).not.toHaveBeenCalled();
  setVisibility('visible');
  setVisibility('visible');
  expect(mockedTrack).toHaveBeenCalledTimes(1);
  setVisibility('hidden');
  setVisibility('visible');
  expect(mockedTrack).toHaveBeenCalledTimes(2);
});

test('excludes a closed sidebar and counts each reopening after intersection', () => {
  act(() => root.render(<Entry enabled={false} />));
  expect(globalThis.IntersectionObserver).not.toHaveBeenCalled();
  act(() => root.render(<Entry />));
  intersect(true);
  expect(mockedTrack).toHaveBeenCalledTimes(1);
  act(() => root.render(<Entry enabled={false} />));
  expect(disconnect).toHaveBeenCalledTimes(1);
  act(() => root.render(<Entry />));
  expect(mockedTrack).toHaveBeenCalledTimes(1);
  intersect(true);
  expect(mockedTrack).toHaveBeenCalledTimes(2);
});

test('cleans up observers and visibility listeners across Strict Mode setup', () => {
  act(() =>
    root.render(
      <StrictMode>
        <Entry />
      </StrictMode>
    )
  );
  intersect(true);
  expect(mockedTrack).toHaveBeenCalledTimes(1);
  const staleCallback = callback;
  const element = container.firstElementChild;
  act(() => root.render(null));
  act(() =>
    staleCallback(
      [
        {
          target: element,
          isIntersecting: true,
          intersectionRatio: 1,
        } as IntersectionObserverEntry,
      ],
      {} as IntersectionObserver
    )
  );
  setVisibility('hidden');
  setVisibility('visible');
  expect(mockedTrack).toHaveBeenCalledTimes(1);
  expect(disconnect).toHaveBeenCalledTimes(2);
});

test('counts each pathname transition and return without counting same-page renders', () => {
  act(() => root.render(<Entry />));
  intersect(true);
  expect(mockedTrack).toHaveBeenCalledTimes(1);
  const staleCallback = callback;
  act(() => root.render(<Entry pathname="/namespace/invite-referral" />));
  act(() =>
    staleCallback(
      [
        {
          target: container.firstElementChild,
          isIntersecting: true,
          intersectionRatio: 1,
        } as IntersectionObserverEntry,
      ],
      {} as IntersectionObserver
    )
  );
  expect(mockedTrack).toHaveBeenCalledTimes(1);
  intersect(true);
  intersect(true);
  expect(mockedTrack).toHaveBeenCalledTimes(2);
  act(() => root.render(<Entry />));
  intersect(true);
  expect(mockedTrack).toHaveBeenCalledTimes(3);
  act(() => root.render(<Entry />));
  intersect(true);
  expect(mockedTrack).toHaveBeenCalledTimes(3);
});

test('defers route exposures until a hidden tab becomes visible', () => {
  act(() => root.render(<Entry />));
  intersect(true);
  setVisibility('hidden');
  act(() => root.render(<Entry pathname="/namespace/invite-referral" />));
  intersect(true);
  act(() => root.render(<Entry />));
  intersect(true);
  expect(mockedTrack).toHaveBeenCalledTimes(1);
  setVisibility('visible');
  setVisibility('visible');
  expect(mockedTrack).toHaveBeenCalledTimes(2);
});

test('defers route exposures while the sidebar is closed or the entry is offscreen', () => {
  act(() => root.render(<Entry />));
  intersect(true);
  act(() =>
    root.render(<Entry enabled={false} pathname="/namespace/invite-referral" />)
  );
  act(() => root.render(<Entry enabled={false} />));
  expect(mockedTrack).toHaveBeenCalledTimes(1);
  act(() => root.render(<Entry />));
  intersect(false);
  expect(mockedTrack).toHaveBeenCalledTimes(1);
  intersect(true);
  expect(mockedTrack).toHaveBeenCalledTimes(2);
  act(() => root.render(<Entry pathname="/namespace/invite-referral" />));
  intersect(false);
  expect(mockedTrack).toHaveBeenCalledTimes(2);
  intersect(true);
  expect(mockedTrack).toHaveBeenCalledTimes(3);
});

function box(
  left: number,
  top: number,
  width: number,
  height: number
): DOMRect {
  return {
    x: left,
    y: top,
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    toJSON: () => ({}),
  } as DOMRect;
}

test('classifies viewport intersection without treating an unmeasured box as hidden', () => {
  const viewport = { width: 1440, height: 900 };
  expect(inviteEntryOnScreen(box(0, 0, 0, 0), viewport)).toBeNull();
  expect(inviteEntryOnScreen(box(16, 100, 64, 20), viewport)).toBe(true);
  expect(inviteEntryOnScreen(box(-200, 100, 64, 20), viewport)).toBe(false);
  expect(inviteEntryOnScreen(box(16, 100, 64, 0), viewport)).toBe(false);
  expect(
    inviteEntryOnScreen(box(16, 100, 64, 20), { width: 0, height: 0 })
  ).toBeNull();
});

test('counts load, sidebar reopen, and a return from another page from layout', () => {
  const rect = box(16, 100, 64, 20);
  const original = HTMLElement.prototype.getBoundingClientRect;
  HTMLElement.prototype.getBoundingClientRect = () => rect;
  try {
    act(() => root.render(<Entry />));
    expect(mockedTrack).toHaveBeenCalledTimes(1);

    act(() => root.render(<Entry enabled={false} />));
    Object.assign(rect, box(-220, 100, 64, 20));
    act(() => root.render(<Entry />));
    expect(mockedTrack).toHaveBeenCalledTimes(1);
    Object.assign(rect, box(16, 100, 64, 20));
    act(() => document.dispatchEvent(new Event('transitionend')));
    expect(mockedTrack).toHaveBeenCalledTimes(2);
    act(() => document.dispatchEvent(new Event('transitionend')));
    expect(mockedTrack).toHaveBeenCalledTimes(2);

    act(() =>
      root.render(<Entry enabled={false} pathname="/namespace/other" />)
    );
    expect(mockedTrack).toHaveBeenCalledTimes(2);
    act(() => root.render(<Entry />));
    expect(mockedTrack).toHaveBeenCalledTimes(3);

    act(() => {
      visibility = 'hidden';
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(mockedTrack).toHaveBeenCalledTimes(3);
    act(() => {
      visibility = 'visible';
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(mockedTrack).toHaveBeenCalledTimes(4);

    const restored = new Event('pageshow');
    Object.defineProperty(restored, 'persisted', { value: true });
    act(() => window.dispatchEvent(restored));
    expect(mockedTrack).toHaveBeenCalledTimes(5);
    act(() => window.dispatchEvent(new Event('pageshow')));
    expect(mockedTrack).toHaveBeenCalledTimes(5);
  } finally {
    HTMLElement.prototype.getBoundingClientRect = original;
  }
});
