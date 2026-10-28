/** @jest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { http } from '@/lib/request';

import { useCommentMentionUsers } from './useCommentMentionUsers';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const listeners = new Set<(id: string) => void>();
const app = {
  on: (_event: string, callback: (id: string) => void) => {
    listeners.add(callback);
    return () => listeners.delete(callback);
  },
};

jest.mock('@/hooks/useApp', () => ({
  __esModule: true,
  default: () => app,
}));

jest.mock('react', () => {
  const react = jest.requireActual<typeof import('react')>('react');
  return { ...react, default: react };
});
jest.mock('@/lib/request', () => ({ http: { get: jest.fn() } }));
jest.mock('./ResourceCommentsContext', () => ({
  useResourceCommentsPanel: () => ({ namespaceId: 'ns' }),
}));

function Probe() {
  const directory = useCommentMentionUsers();
  return <span>{directory.users.map(user => user.name).join()}</span>;
}

describe('useCommentMentionUsers', () => {
  let root: Root;
  let container: HTMLDivElement;

  beforeEach(() => {
    listeners.clear();
    jest.mocked(http.get).mockReset();
    jest.mocked(http.get).mockResolvedValue([]);
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it('shares one members request across every comment input', async () => {
    await act(async () => {
      root.render(
        <>
          <Probe />
          <Probe />
        </>
      );
    });
    expect(http.get).toHaveBeenCalledTimes(1);
  });

  it('keeps the newest invalidation when a prior refresh is still pending', async () => {
    await act(async () => {
      root.render(<Probe />);
    });
    let stale!: (value: unknown) => void;
    jest.mocked(http.get).mockReturnValueOnce(
      new Promise(resolve => {
        stale = resolve;
      })
    );
    await act(async () => {
      listeners.forEach(listener => listener('ns'));
    });
    jest
      .mocked(http.get)
      .mockResolvedValueOnce([
        { user_id: 'u1', username: 'Newest', nickname: null },
      ]);
    await act(async () => {
      listeners.forEach(listener => listener('ns'));
    });
    expect(http.get).toHaveBeenCalledTimes(3);
    expect(container.textContent).toContain('Newest');
    await act(async () => {
      stale([{ user_id: 'u1', username: 'Stale' }]);
    });
    expect(container.textContent).toContain('Newest');
    expect(container.textContent).not.toContain('Stale');
  });

  it('loads members again the next time the comment UI mounts', async () => {
    await act(async () => {
      root.render(<Probe />);
    });
    expect(http.get).toHaveBeenCalledTimes(1);

    await act(async () => root.unmount());
    root = createRoot(container);
    await act(async () => {
      root.render(<Probe />);
    });
    expect(http.get).toHaveBeenCalledTimes(2);
  });

  it('reloads when a member profile in this namespace is saved', async () => {
    await act(async () => {
      root.render(<Probe />);
    });
    expect(http.get).toHaveBeenCalledTimes(1);

    await act(async () => {
      listeners.forEach(listener => listener('other'));
    });
    expect(http.get).toHaveBeenCalledTimes(1);

    await act(async () => {
      listeners.forEach(listener => listener('ns'));
    });
    expect(http.get).toHaveBeenCalledTimes(2);
  });
});
