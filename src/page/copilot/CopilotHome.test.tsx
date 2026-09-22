/** @jest-environment jsdom */
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import { http } from '@/lib/request';

import CopilotHome from './CopilotHome';

jest.mock('@/lib/request', () => ({
  http: { get: jest.fn(), post: jest.fn() },
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('@/hooks/useConfig', () => ({
  __esModule: true,
  default: () => ({ config: { commercial: true }, loading: false }),
}));
jest.mock('@/page/chat/agent-credits/useAgentCredits', () => ({
  useAgentCredits: () => ({ agentCredits: undefined }),
}));
jest.mock('@/page/chat/agent-credits/AgentCredits', () => ({
  AgentCredits: () => null,
}));
jest.mock('@/page/chat/useSelectedResources', () => ({
  __esModule: true,
  default: () => ({
    selectedResources: [],
    setSelectedResources: jest.fn(),
  }),
}));
jest.mock('@/page/chat/chat-input', () => ({
  __esModule: true,
  default: ({
    fillQuery,
    sendMessage,
  }: {
    fillQuery?: string;
    sendMessage: (params: { query: string }) => void;
  }) => (
    <>
      <textarea data-testid="composer" readOnly value={fillQuery ?? ''} />
      <button
        type="button"
        data-testid="send"
        onClick={() => sendMessage({ query: fillQuery ?? '' })}
      >
        send
      </button>
    </>
  ),
}));
jest.mock('./copilotStore', () => ({
  useCopilotStore: (
    selector: (state: { showConversation: jest.Mock }) => unknown
  ) => selector({ showConversation: jest.fn() }),
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

it('fills the composer from a recommended question without sending', async () => {
  jest.mocked(http.get).mockResolvedValue({
    questions: [{ id: 'one', question: 'Copilot question' }],
  });
  const container = document.createElement('div');
  const root = createRoot(container);

  try {
    await act(async () => root.render(<CopilotHome namespaceId="space" />));
    await act(async () => undefined);

    expect(container.querySelector('h1')).toBeNull();
    expect(container.textContent).not.toContain('chat.home.greeting.');

    const mascot = container.querySelector('svg');
    const bubble = container.querySelectorAll('button')[1] as HTMLButtonElement;
    expect(mascot?.getAttribute('class')).toBe('h-[77px] w-[73px]');
    expect(bubble.className).toContain('min-h-12');
    expect(bubble.className).toContain('w-full');
    expect(bubble.className).toContain('pl-6');
    expect(bubble.className).toContain('text-sm');
    expect(bubble.textContent).toBe('Copilot question');
    await act(async () => bubble.click());

    expect(
      (
        container.querySelector(
          '[data-testid="composer"]'
        ) as HTMLTextAreaElement
      ).value
    ).toBe('Copilot question');
    expect(http.post).not.toHaveBeenCalled();
  } finally {
    await act(async () => root.unmount());
  }
});
