/** @jest-environment jsdom */

import { act } from 'react';
import { createRoot } from 'react-dom/client';

import type { MessageOperator } from '../core/messageOperator';
import { MessageStatus, OpenAIMessageRole } from '../core/types/chatResponse';
import type { MessageDetail } from '../core/types/conversation';
import { Messages } from '../messages';
import { MessageDetailsContext } from './MessageDetailsContext';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('@/hooks/useApp', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@/page/chat/components/ToolCallArgs', () => ({
  ToolCallArgs: () => null,
}));
jest.mock('@/page/localRuntime/ConversationExecutions', () => ({
  ToolCallExecution: () => null,
}));
jest.mock('../messages/citations/CitationMarkdown', () => ({
  CitationMarkdown: () => <p>Final answer</p>,
}));
jest.mock('../messages/role/ToolMessage', () => ({ ToolMessage: () => null }));
jest.mock('../messages/role/UserMessage', () => ({ UserMessage: () => null }));
jest.mock('../share/ConversationShareMessageRow', () => ({
  ConversationShareMessageRow: () => null,
}));
jest.mock('@/page/share/ShareChatOnlyContext', () => ({
  useShareChatOnly: () => false,
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

test('an expanded history process opens both detail panels and resets them on reopening', async () => {
  const process: MessageDetail = {
    id: 'process',
    clientKey: 1,
    children: [],
    parent_id: '',
    status: MessageStatus.SUCCESS,
    details_loaded: true,
    has_reasoning: true,
    tool_call_summaries: [{ id: 'call-1', name: 'read_resource' }],
    message: {
      role: OpenAIMessageRole.ASSISTANT,
      reasoning_content: 'Reasoning details',
    },
  };
  const answer: MessageDetail = {
    id: 'answer',
    clientKey: 2,
    children: [],
    parent_id: process.id,
    status: MessageStatus.SUCCESS,
    message: { role: OpenAIMessageRole.ASSISTANT, content: 'Final answer' },
  };
  const messageOperator = {
    getParent: () => undefined,
    getSiblings: () => [],
  } as unknown as MessageOperator;
  const load = jest
    .fn()
    .mockRejectedValueOnce(new Error('Detail request failed'))
    .mockResolvedValue({ process });
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);

  try {
    act(() => {
      root.render(
        <MessageDetailsContext.Provider value={load}>
          <Messages
            conversation={{ id: 'chat', mapping: { process, answer } }}
            messages={[process, answer]}
            messageOperator={messageOperator}
            onRegenerate={() => {}}
            onEdit={() => {}}
          />
        </MessageDetailsContext.Provider>
      );
    });

    const details = container.querySelector('details')!;
    const summary = details.querySelector('summary')!;
    const toggleProcess = () =>
      act(async () => {
        summary.click();
        await new Promise(resolve => setTimeout(resolve, 0));
      });
    const openPanelNames = () =>
      [...details.querySelectorAll('button[aria-expanded="true"]')].map(
        button => button.textContent?.trim()
      );

    expect(load).not.toHaveBeenCalled();
    await toggleProcess();
    expect(load).toHaveBeenCalledTimes(1);
    expect(load).toHaveBeenCalledWith(['process']);
    const retry = details.querySelector('button')!;
    expect(retry.textContent).toBe('chat.history.retry_details');

    await act(async () => retry.click());
    expect(openPanelNames()).toEqual([
      'chat.tools.reasoning',
      'chat.tools.tool_calls',
    ]);
    expect(details.textContent).toContain('Reasoning details');
    expect(details.textContent).toContain('read_resource');
    expect(load).toHaveBeenCalledTimes(2);

    const reasoning = details.querySelector<HTMLButtonElement>(
      'button[aria-expanded="true"]'
    )!;
    act(() => reasoning.click());
    expect(reasoning.getAttribute('aria-expanded')).toBe('false');
    expect(openPanelNames()).toEqual(['chat.tools.tool_calls']);

    await toggleProcess();
    expect(openPanelNames()).toHaveLength(0);
    await toggleProcess();
    expect(openPanelNames()).toHaveLength(2);
    expect(load).toHaveBeenCalledTimes(3);
  } finally {
    act(() => root.unmount());
    container.remove();
  }
});
