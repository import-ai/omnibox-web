/** @jest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { http } from '@/lib/request';

import { useMentionUsers } from './useMentionUsers';

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

const readyStates: boolean[] = [];

function Probe() {
  const { ready } = useMentionUsers('ns');
  readyStates.push(ready);
  return null;
}

describe('useMentionUsers', () => {
  let root: Root;
  let container: HTMLDivElement;

  beforeEach(() => {
    listeners.clear();
    readyStates.length = 0;
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

  it('finishes initial loading when a refresh supersedes the initial request', async () => {
    let finishInitial!: (value: never[]) => void;
    jest.mocked(http.get).mockReturnValueOnce(
      new Promise(resolve => {
        finishInitial = resolve;
      })
    );
    await act(async () => {
      root.render(<Probe />);
    });
    await act(async () => {
      listeners.forEach(listener => listener('ns'));
    });
    expect(readyStates.at(-1)).toBe(true);
    await act(async () => {
      finishInitial([]);
    });
    expect(readyStates.at(-1)).toBe(true);
  });

  it('reloads after a profile save without unloading the document', async () => {
    await act(async () => {
      root.render(<Probe />);
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(http.get).toHaveBeenCalledTimes(1);
    expect(readyStates.at(-1)).toBe(true);

    const before = readyStates.length;
    await act(async () => {
      listeners.forEach(listener => listener('ns'));
      await Promise.resolve();
    });
    expect(http.get).toHaveBeenCalledTimes(2);
    expect(readyStates.slice(before).every(ready => ready)).toBe(true);
  });
});
