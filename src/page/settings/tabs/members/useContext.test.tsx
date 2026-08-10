/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import { http } from '@/lib/request';

import useMembersContext from './useContext';

const navigate = jest.fn();
let latestContext: ReturnType<typeof useMembersContext> | undefined;

jest.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
  useParams: () => ({ namespace_id: 'namespace-1' }),
}));

jest.mock('@/lib/request', () => ({
  http: { get: jest.fn() },
}));

function ContextHarness({ canManageMembers }: { canManageMembers: boolean }) {
  latestContext = useMembersContext(canManageMembers);
  return null;
}

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('useMembersContext', () => {
  let container: HTMLDivElement;
  let root: Root;
  const get = http.get as jest.MockedFunction<typeof http.get>;

  beforeEach(() => {
    jest.clearAllMocks();
    latestContext = undefined;
    get.mockImplementation(async url => {
      if (url.endsWith('/members')) {
        return [];
      }
      if (url.endsWith('/groups') || url.includes('/invitations')) {
        return [];
      }
      return { id: 'namespace-1', name: 'Workspace' };
    });
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
  });

  it('does not request admin-only resources for members', async () => {
    await act(async () => {
      root.render(<ContextHarness canManageMembers={false} />);
      await Promise.resolve();
    });

    expect(get.mock.calls.map(([url]) => url)).toEqual([
      'namespaces/namespace-1/members',
      'namespaces/namespace-1',
    ]);
  });

  it('loads group management resources for owners and admins', async () => {
    await act(async () => {
      root.render(<ContextHarness canManageMembers />);
      await Promise.resolve();
    });

    expect(get.mock.calls.map(([url]) => url)).toEqual([
      'namespaces/namespace-1/members',
      'namespaces/namespace-1',
      'namespaces/namespace-1/groups',
      'namespaces/namespace-1/invitations?type=group',
    ]);
  });

  it('ignores a stale member-only response after management access loads', async () => {
    let resolveMemberRequest: (value: unknown) => void = () => undefined;
    get.mockImplementation(url => {
      if (url.endsWith('/members') && get.mock.calls.length === 1) {
        return new Promise(resolve => {
          resolveMemberRequest = resolve;
        });
      }
      if (url.endsWith('/groups')) {
        return Promise.resolve([{ id: 'group-1', title: 'Team' }]);
      }
      if (url.includes('/invitations')) {
        return Promise.resolve([]);
      }
      if (url.endsWith('/members')) {
        return Promise.resolve([]);
      }
      return Promise.resolve({ id: 'namespace-1', name: 'Workspace' });
    });

    await act(async () =>
      root.render(<ContextHarness canManageMembers={false} />)
    );
    await act(async () => root.render(<ContextHarness canManageMembers />));

    expect(latestContext?.data.group).toEqual([
      { id: 'group-1', title: 'Team' },
    ]);

    await act(async () => {
      resolveMemberRequest([]);
      await Promise.resolve();
    });

    expect(latestContext?.data.group).toEqual([
      { id: 'group-1', title: 'Team' },
    ]);
    expect(navigate).not.toHaveBeenCalled();
    expect(get.mock.calls.map(([url]) => url)).toContain(
      'namespaces/namespace-1/groups'
    );
  });
});
