/** @jest-environment jsdom */
import { act, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { track } from '@/lib/sendTrackEvent';

import { useInviteReferralEntryExposure } from './useInviteReferralEntryExposure';

jest.mock('@/lib/sendTrackEvent', () => ({ track: jest.fn() }));

let callback: IntersectionObserverCallback;
let disconnect: jest.Mock;
let container: HTMLDivElement;
let root: Root;
let visibility: DocumentVisibilityState;
const mockedTrack = jest.mocked(track);

function Entry({ enabled = true }: { enabled?: boolean }) {
  const ref = useInviteReferralEntryExposure(enabled);
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
