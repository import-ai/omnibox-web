/** @jest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { http } from '@/lib/request';

import useSmartFolderEntitlements from './useSmartFolderEntitlements';

jest.mock('@/lib/request', () => ({ http: { get: jest.fn() } }));
jest.mock('@/page/sidebar/store', () => ({
  useSidebarStore: jest.fn().mockReturnValue(0),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function deferredResponse() {
  type Response = { tier: 'basic' | 'premium'; rule_limit: number };
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>(done => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('useSmartFolderEntitlements', () => {
  let root: Root;
  let user = 0;
  let current: ReturnType<typeof useSmartFolderEntitlements>;

  function Probe({ namespaceId }: { namespaceId: string }) {
    current = useSmartFolderEntitlements({ namespaceId });
    return null;
  }

  const render = (namespaceId: string) =>
    act(async () => root.render(<Probe namespaceId={namespaceId} />));

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('uid', `entitlements-user-${++user}`);
    root = createRoot(document.createElement('div'));
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    localStorage.removeItem('uid');
  });

  it('does not expose the previous space limit while the new request is pending', async () => {
    const basic = deferredResponse();
    (http.get as jest.Mock)
      .mockResolvedValueOnce({ tier: 'premium', rule_limit: 10 })
      .mockReturnValueOnce(basic.promise);

    await render('premium');
    expect(current.data?.ruleLimit).toBe(10);

    await render('basic');
    expect(current.data).toBeUndefined();
    await act(async () => basic.resolve({ tier: 'basic', rule_limit: 3 }));
    expect(current.data).toMatchObject({ tier: 'basic', ruleLimit: 3 });
  });

  it('ignores a previous space response that arrives after the current one', async () => {
    const premium = deferredResponse();
    (http.get as jest.Mock)
      .mockReturnValueOnce(premium.promise)
      .mockResolvedValueOnce({ tier: 'basic', rule_limit: 3 });

    await render('premium');
    await render('basic');
    expect(current.data?.ruleLimit).toBe(3);

    await act(async () => premium.resolve({ tier: 'premium', rule_limit: 10 }));
    expect(current.data).toMatchObject({ tier: 'basic', ruleLimit: 3 });
    expect(current.loading).toBe(false);
  });
});
