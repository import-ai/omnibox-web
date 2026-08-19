/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import {
  MessageStatus,
  OpenAIMessageRole,
} from '@/page/chat/core/types/chatResponse';
import type { MessageDetail } from '@/page/chat/core/types/conversation';
import { ShareChatOnlyProvider } from '@/page/share/ShareChatOnlyContext';

import { Messages } from './index';

jest.mock('react-router-dom', () => ({
  useParams: () => ({ share_id: 'Share12345' }),
  useLocation: () => ({ pathname: '/s/Share12345' }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('./role/AssistantMessage', () => ({
  AssistantMessage: () => <div data-testid="assistant" />,
}));
jest.mock('./role/UserMessage', () => ({
  UserMessage: () => <div data-testid="user" />,
}));
jest.mock('./role/ToolMessage', () => ({
  ToolMessage: () => <div data-testid="tool" />,
}));

const toolMessage = {
  id: 'tool-1',
  parent_id: '',
  children: [],
  status: MessageStatus.SUCCESS,
  message: { role: OpenAIMessageRole.TOOL, content: '' },
  attrs: {
    citations: [
      {
        id: 'citation-a',
        title: 'Shared doc',
        snippet: 'Snippet body',
        link: 'Abcd1234Efgh5678',
      },
    ],
  },
} as unknown as MessageDetail;

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('citations on a chat-only share', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  const render = (chatOnly: boolean) =>
    act(() => {
      root.render(
        <ShareChatOnlyProvider chatOnly={chatOnly}>
          <Messages
            conversation={{} as never}
            messages={[toolMessage]}
            messageOperator={{} as never}
            onRegenerate={() => {}}
            onEdit={() => {}}
          />
        </ShareChatOnlyProvider>
      );
    });

  it('renders the citations block on an ordinary share', () => {
    render(false);
    expect(container.querySelector('[data-testid="tool"]')).not.toBeNull();
  });

  it('leaves no block at all on a chat-only share', () => {
    render(true);
    expect(container.querySelector('[data-testid="tool"]')).toBeNull();
    // The wrapper is spaced with space-y-4, so an empty block would show as a gap.
    expect(container.querySelector('[id^="message-"]')).toBeNull();
  });
});
