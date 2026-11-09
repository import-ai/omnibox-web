/** @jest-environment jsdom */
import { act, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { track } from '@/lib/sendTrackEvent';

import { useAuthPageExposure } from './useAuthPageExposure';

jest.mock('@/lib/sendTrackEvent', () => ({ track: jest.fn(async () => {}) }));
const mockedTrack = jest.mocked(track);
(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let container: HTMLDivElement;
let visible = true;
let layoutVisible = true;

function Harness({ path = '/user/login', ready = true, show = true }) {
  useAuthPageExposure(path, ready);
  return show ? (
    <form data-auth-page={path === '/user/sign-up' ? 'register' : 'login'} />
  ) : null;
}
async function render(path = '/user/login', ready = true, show = true) {
  await act(async () =>
    root.render(
      <StrictMode>
        <Harness path={path} ready={ready} show={show} />
      </StrictMode>
    )
  );
  await act(async () => {
    jest.advanceTimersByTime(20);
  });
}
async function visibility(value: boolean) {
  visible = value;
  await act(async () => {
    document.dispatchEvent(new Event('visibilitychange'));
    jest.advanceTimersByTime(20);
  });
}
beforeEach(() => {
  jest.useFakeTimers();
  mockedTrack.mockClear();
  localStorage.clear();
  visible = layoutVisible = true;
  jest
    .spyOn(document, 'visibilityState', 'get')
    .mockImplementation(() => (visible ? 'visible' : 'hidden'));
  jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
    () =>
      ({
        width: layoutVisible ? 200 : 0,
        height: 100,
        top: 0,
        left: 0,
        right: 200,
        bottom: 100,
      }) as DOMRect
  );
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  jest.restoreAllMocks();
  jest.useRealTimers();
});

test.each([
  ['/user/login', 'login_page_view'],
  ['/user/sign-up', 'registration_page_view'],
])('counts only the visible %s page', async (path, name) => {
  await render(path);
  expect(mockedTrack).toHaveBeenCalledTimes(1);
  expect(mockedTrack).toHaveBeenCalledWith(
    name,
    expect.objectContaining({
      page_view_id: expect.any(String),
      occurred_at: expect.any(String),
      schema_version: 1,
      platform: 'web',
    })
  );
  expect(mockedTrack.mock.calls[0][1]).not.toHaveProperty('once');
});
test('counts login → register → login as three distinct exposures', async () => {
  await render();
  await render('/user/sign-up');
  await render();
  expect(mockedTrack.mock.calls.map(([name]) => name)).toEqual([
    'login_page_view',
    'registration_page_view',
    'login_page_view',
  ]);
  expect(
    new Set(mockedTrack.mock.calls.map(([, props]) => props?.page_view_id)).size
  ).toBe(3);
});
test('does not count StrictMode, rerenders, query state or foreground return twice', async () => {
  await render();
  await render();
  await visibility(false);
  await visibility(true);
  await act(async () => {
    container.querySelector('form')!.setAttribute('class', 'changed');
  });
  await act(async () => {
    jest.advanceTimersByTime(20);
  });
  expect(mockedTrack).toHaveBeenCalledTimes(1);
});
test('waits for anonymous session restoration and excludes authenticated redirects', async () => {
  await render('/user/login', false);
  expect(mockedTrack).not.toHaveBeenCalled();
  localStorage.setItem('uid', 'already-signed-in');
  await render();
  expect(mockedTrack).not.toHaveBeenCalled();
});
test('counts after session restoration determines the visitor is anonymous', async () => {
  await render('/user/sign-up', false);
  await render('/user/sign-up', true);
  expect(mockedTrack).toHaveBeenCalledTimes(1);
});
test('does not count hidden preloading until first foreground display', async () => {
  visible = false;
  await render('/user/sign-up');
  expect(mockedTrack).not.toHaveBeenCalled();
  await visibility(true);
  expect(mockedTrack).toHaveBeenCalledTimes(1);
});
test('waits for lazy form mounting and real layout', async () => {
  await render('/user/login', true, false);
  expect(mockedTrack).not.toHaveBeenCalled();
  layoutVisible = false;
  await render();
  expect(mockedTrack).not.toHaveBeenCalled();
  layoutVisible = true;
  await visibility(true);
  expect(mockedTrack).toHaveBeenCalledTimes(1);
});
test('retains the visit across OTP and auth callback child steps', async () => {
  await render();
  await render('/user/verify-otp', true, false);
  await render();
  await render('/user/auth/confirm', true, false);
  await render();
  expect(mockedTrack).toHaveBeenCalledTimes(1);
});
test('starts a new visit after leaving authentication', async () => {
  await render();
  await render('/welcome', true, false);
  await render();
  expect(mockedTrack).toHaveBeenCalledTimes(2);
});
test('does not report a target mode that never displays its form', async () => {
  await render();
  await render('/user/sign-up', true, false);
  expect(mockedTrack).toHaveBeenCalledTimes(1);
  await render('/user/sign-up');
  expect(mockedTrack).toHaveBeenCalledTimes(2);
});
test('cancels pending exposure after unmount', async () => {
  await act(async () => root.render(<Harness />));
  await act(async () => root.render(null));
  await act(async () => {
    jest.advanceTimersByTime(20);
  });
  expect(mockedTrack).not.toHaveBeenCalled();
});
