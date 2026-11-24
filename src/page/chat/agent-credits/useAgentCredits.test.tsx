/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import { http } from '@/lib/request';
import {
  MessageStatus,
  OpenAIMessageRole,
} from '@/page/chat/core/types/chatResponse.ts';
import { MessageDetail } from '@/page/chat/core/types/conversation';

import { useAgentCredits } from './useAgentCredits';

jest.mock('@/lib/request', () => ({
  http: {
    get: jest.fn(),
  },
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const message = (
  id: string,
  role: OpenAIMessageRole,
  content: string
): MessageDetail =>
  ({
    id,
    parent_id: '',
    children: [],
    status: MessageStatus.SUCCESS,
    message: { role, content },
  }) as unknown as MessageDetail;

const credits = (remain: number) => ({
  agent_credits_total: 100000,
  agent_credits_remain: remain,
});

function Harness({
  namespaceId,
  messages,
  enabled,
}: {
  namespaceId: string;
  messages: MessageDetail[];
  enabled?: boolean;
}) {
  const { agentCredits } = useAgentCredits(namespaceId, messages, enabled);
  return <span>{String(agentCredits?.agent_credits_remain ?? 'none')}</span>;
}

describe('useAgentCredits', () => {
  let container: HTMLDivElement;
  let root: Root;
  const mockGet = http.get as jest.MockedFunction<typeof http.get>;

  beforeEach(() => {
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    jest.clearAllMocks();
  });

  it('reads the remaining agent credits on mount', async () => {
    mockGet.mockResolvedValue(credits(4200));

    await act(async () =>
      root.render(<Harness namespaceId="namespace-a" messages={[]} />)
    );
    await act(async () => Promise.resolve());

    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith(
      '/namespaces/namespace-a/usages/agent'
    );
    expect(container.textContent).toBe('4200');
  });

  it('does not request agent credits when disabled', async () => {
    await act(async () =>
      root.render(
        <Harness namespaceId="namespace-a" messages={[]} enabled={false} />
      )
    );
    await act(async () => Promise.resolve());

    expect(mockGet).not.toHaveBeenCalled();
    expect(container.textContent).toBe('none');
  });

  it('refetches after an assistant message completes', async () => {
    mockGet.mockResolvedValueOnce(credits(4200)).mockResolvedValueOnce({
      agent_credits_total: 100000,
      agent_credits_remain: 0,
    });

    await act(async () =>
      root.render(<Harness namespaceId="namespace-a" messages={[]} />)
    );
    await act(async () => Promise.resolve());
    expect(mockGet).toHaveBeenCalledTimes(1);

    await act(async () =>
      root.render(
        <Harness
          namespaceId="namespace-a"
          messages={[
            message('u1', OpenAIMessageRole.USER, 'hi'),
            message('a1', OpenAIMessageRole.ASSISTANT, 'hello'),
          ]}
        />
      )
    );
    await act(async () => Promise.resolve());

    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(container.textContent).toBe('0');
  });

  it.each([MessageStatus.SUCCESS, MessageStatus.STOPPED, MessageStatus.FAILED])(
    'reconciles a %s reply billed after the early rechecks',
    async status => {
      jest.useFakeTimers();
      const visibility = jest.spyOn(document, 'visibilityState', 'get');
      try {
        let balance = 51_000_000;
        mockGet.mockImplementation(async () => credits(balance));
        const assistant = message('a1', OpenAIMessageRole.ASSISTANT, 'hello');

        await act(async () =>
          root.render(<Harness namespaceId="namespace-a" messages={[]} />)
        );
        await act(async () =>
          root.render(
            <Harness
              namespaceId="namespace-a"
              messages={[{ ...assistant, status: MessageStatus.STREAMING }]}
            />
          )
        );
        expect(mockGet).toHaveBeenCalledTimes(1);

        await act(async () =>
          root.render(
            <Harness
              namespaceId="namespace-a"
              messages={[{ ...assistant, status }]}
            />
          )
        );
        expect(mockGet).toHaveBeenCalledTimes(2);
        expect(container.textContent).toBe('51000000');

        await act(async () => jest.advanceTimersByTimeAsync(1000));
        await act(async () => jest.advanceTimersByTimeAsync(2000));
        expect(mockGet).toHaveBeenCalledTimes(4);
        expect(container.textContent).toBe('51000000');

        await act(async () => jest.advanceTimersByTimeAsync(1000));
        balance = 45_000_000;
        await act(async () => jest.advanceTimersByTimeAsync(11_000));
        expect(container.textContent).toBe('45000000');

        visibility.mockReturnValue('hidden');
        await act(async () => jest.advanceTimersByTimeAsync(15_000));
        expect(mockGet).toHaveBeenCalledTimes(5);

        visibility.mockRestore();
        await act(async () => root.unmount());
        await act(async () => jest.advanceTimersByTimeAsync(15_000));
        expect(mockGet).toHaveBeenCalledTimes(5);
      } finally {
        visibility.mockRestore();
        jest.useRealTimers();
      }
    }
  );

  it('ignores a response that resolves after the namespace changed', async () => {
    let resolveStale!: (value: {
      agent_credits_total: number;
      agent_credits_remain: number;
    }) => void;
    const stale = new Promise<{
      agent_credits_total: number;
      agent_credits_remain: number;
    }>(resolve => {
      resolveStale = resolve;
    });
    mockGet.mockReturnValueOnce(stale).mockResolvedValueOnce(credits(10));

    await act(async () =>
      root.render(<Harness namespaceId="namespace-a" messages={[]} />)
    );
    await act(async () =>
      root.render(<Harness namespaceId="namespace-b" messages={[]} />)
    );
    await act(async () => Promise.resolve());

    await act(async () => {
      resolveStale(credits(999));
      await stale;
    });

    expect(container.textContent).toBe('10');
  });
});
