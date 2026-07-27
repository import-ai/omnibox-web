/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import { http } from '@/lib/request';

import { useAgentUsage } from './useAgentUsage';

jest.mock('@/lib/request', () => ({
  http: {
    get: jest.fn(),
  },
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function Harness() {
  useAgentUsage('namespace-a', []);
  return null;
}

describe('useAgentUsage', () => {
  let container: HTMLDivElement;
  let root: Root;
  const mockGet = http.get as jest.MockedFunction<typeof http.get>;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-24T23:00:00Z'));
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('retries until the first exhausted trial use recovers', async () => {
    mockGet
      .mockResolvedValueOnce({
        agent_trial_limit: 10,
        agent_trial_remain: 0,
        first_message_date: '2026-07-24T00:00:00Z',
        last_message_date: '2026-07-24T09:00:00Z',
      })
      .mockResolvedValueOnce({
        agent_trial_limit: 10,
        agent_trial_remain: 0,
        first_message_date: '2026-07-24T00:00:00Z',
        last_message_date: '2026-07-24T09:00:00Z',
      })
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce({
        agent_trial_limit: 10,
        agent_trial_remain: 1,
        first_message_date: '2026-07-24T01:00:00Z',
        last_message_date: '2026-07-24T09:00:00Z',
      });

    await act(async () => root.render(<Harness />));
    await act(async () => Promise.resolve());

    expect(mockGet).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(60 * 60 * 1000 + 1000);
      await Promise.resolve();
    });

    expect(mockGet).toHaveBeenCalledTimes(2);

    await act(async () => {
      jest.advanceTimersByTime(30 * 1000);
      await Promise.resolve();
    });

    expect(mockGet).toHaveBeenCalledTimes(3);

    await act(async () => {
      jest.advanceTimersByTime(30 * 1000);
      await Promise.resolve();
    });

    expect(mockGet).toHaveBeenCalledTimes(4);

    await act(async () => {
      jest.advanceTimersByTime(30 * 1000);
      await Promise.resolve();
    });

    expect(mockGet).toHaveBeenCalledTimes(4);
  });
});
