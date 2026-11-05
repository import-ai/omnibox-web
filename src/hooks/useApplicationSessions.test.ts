/** @jest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';

import type { Application } from '@/interface';
import { http } from '@/lib/request';

import useApplications from './useApplications';
jest.mock('@/lib/request', () => ({
  http: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
}));
jest.mock('@/const', () => ({ BIND_CHECK_INTERVAL: 3000 }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const apps = [
  'wechat_oa_bot',
  'wechat_bot',
  'qq_bot',
  'wechat_clawbot',
  'telegram_bot',
];
let remote: Record<string, Application[]>;
let latest: Record<string, ReturnType<typeof useApplications>>;
let notice: Record<string, jest.Mock>;
let roots: ReturnType<typeof createRoot>[];
function Probe({
  client,
  ns = 'same-namespace',
  active = true,
}: {
  client: string;
  ns?: string;
  active?: boolean;
}) {
  latest[client] = useApplications(ns, {
    active,
    syncBindingIds: apps,
    onUnbound: notice[client],
  });
  return null;
}
beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    value: 'visible',
  });
  remote = {};
  latest = {};
  notice = { a: jest.fn(), b: jest.fn() };
  roots = [
    createRoot(document.createElement('div')),
    createRoot(document.createElement('div')),
  ];
  jest
    .mocked(http.get)
    .mockImplementation(async url =>
      JSON.parse(JSON.stringify(remote[String(url)]))
    );
  jest.mocked(http.delete).mockImplementation(async url => {
    const path = String(url);
    const list = path.slice(0, path.lastIndexOf('/'));
    remote[list] = remote[list].map(a =>
      a.id === path.split('/').at(-1)
        ? ({ app_id: a.app_id } as Application)
        : a
    );
  });
});
afterEach(async () => {
  await act(async () => roots.forEach(r => r.unmount()));
  jest.useRealTimers();
});
it.each(apps)(
  'updates the other independent session after local %s deletion, once',
  async app_id => {
    const bound = { app_id, id: 'binding', api_key_id: 'key' } as Application;
    remote['/namespaces/same-namespace/applications'] = [bound];
    await act(async () => {
      roots[0].render(createElement(Probe, { client: 'a' }));
      roots[1].render(createElement(Probe, { client: 'b' }));
    });
    await act(async () => latest.a.unbindApplication('binding'));
    expect(latest.b.applications[0].id).toBe('binding');
    await act(async () => jest.advanceTimersByTime(3000));
    expect(latest.b.applications).toEqual([{ app_id }]);
    expect(notice.b).toHaveBeenCalledTimes(1);
    expect(notice.b).toHaveBeenCalledWith([bound]);
    await act(async () => jest.advanceTimersByTime(9000));
    expect(notice.b).toHaveBeenCalledTimes(1);
  }
);
it('calibrates when the observer re-enters without replaying a historical toast', async () => {
  const app_id = 'wechat_bot';
  remote['/namespaces/same-namespace/applications'] = [
    { app_id, id: 'binding', api_key_id: 'key' } as Application,
  ];
  await act(async () => {
    roots[0].render(createElement(Probe, { client: 'a' }));
    roots[1].render(createElement(Probe, { client: 'b' }));
  });
  await act(async () =>
    roots[1].render(createElement(Probe, { client: 'b', active: false }))
  );
  await act(async () => latest.a.unbindApplication('binding'));
  await act(async () => jest.advanceTimersByTime(9000));
  expect(notice.b).not.toHaveBeenCalled();
  await act(async () => roots[1].render(createElement(Probe, { client: 'b' })));
  expect(latest.b.applications).toEqual([{ app_id }]);
  expect(notice.b).not.toHaveBeenCalled();
});
it('does not remove a binding in the same account’s other namespace', async () => {
  remote['/namespaces/same-namespace/applications'] = [
    {
      app_id: 'wechat_bot',
      id: 'binding-a',
      api_key_id: 'key-a',
    } as Application,
  ];
  remote['/namespaces/other-namespace/applications'] = [
    {
      app_id: 'wechat_bot',
      id: 'binding-b',
      api_key_id: 'key-b',
    } as Application,
  ];
  await act(async () => {
    roots[0].render(createElement(Probe, { client: 'a' }));
    roots[1].render(
      createElement(Probe, { client: 'b', ns: 'other-namespace' })
    );
  });
  await act(async () => latest.a.unbindApplication('binding-a'));
  await act(async () => jest.advanceTimersByTime(3000));
  expect(latest.b.applications[0].id).toBe('binding-b');
  expect(notice.b).not.toHaveBeenCalled();
});
