/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import { TooltipProvider } from '@/components/tooltip';
import { ToolType } from '@/page/chat/chat-input/types';
import { ToolCallArgs } from '@/page/chat/components/ToolCallArgs';
import type { MessageOperator } from '@/page/chat/core/messageOperator';
import {
  MessageStatus,
  OpenAIMessageRole,
} from '@/page/chat/core/types/chatResponse';
import type { MessageDetail } from '@/page/chat/core/types/conversation';
import {
  getCopilotWorkspace,
  useCopilotStore,
} from '@/page/copilot/copilotStore';

import { UserMessage } from './role/UserMessage';

jest.mock('react-router-dom', () => ({
  useParams: () => ({
    conversation_id: 'conversation-a',
    namespace_id: 'namespace-a',
  }),
  useLocation: () => ({
    pathname: '/namespace-a/chat/conversation-a',
  }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/page/sidebar/store', () => ({
  useRootId: () => '',
}));

jest.mock('@/service/resource', () => ({
  fetchResourcesByIds: jest.fn().mockResolvedValue([]),
}));

jest.mock('@/service/share', () => ({
  fetchShareResource: jest.fn(),
}));

const RESOURCE_ID = 'Abcd1234Efgh5678';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function userMessage(): MessageDetail {
  return {
    id: 'message-a',
    parent_id: '',
    children: [],
    status: MessageStatus.SUCCESS,
    message: {
      role: OpenAIMessageRole.USER,
      content: 'note.md summarize this resource',
    },
    attrs: {
      tools: [
        {
          name: ToolType.PRIVATE_SEARCH,
          resources: [{ id: RESOURCE_ID, name: 'note.md', type: 'resource' }],
        },
      ],
    },
  };
}

const messageOperator = {
  activate: jest.fn(),
  getSiblings: () => ['message-a'],
} as unknown as MessageOperator;

describe('chat resource entry points', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    sessionStorage.clear();
    useCopilotStore.setState({ workspaces: {} });
    container = document.createElement('div');
    container.addEventListener('click', event => event.preventDefault());
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  function expectResourceSplit() {
    expect(
      getCopilotWorkspace(useCopilotStore.getState(), 'namespace-a')
    ).toMatchObject({
      open: true,
      view: 'conversation',
      conversationId: 'conversation-a',
      previewResourceId: RESOURCE_ID,
    });
  }

  it('opens a sent user-message resource in the Copilot split', async () => {
    await act(async () => {
      root.render(
        <TooltipProvider>
          <UserMessage
            message={userMessage()}
            messageOperator={messageOperator}
            onEdit={jest.fn()}
          />
        </TooltipProvider>
      );
    });

    const resourceLink = Array.from(container.querySelectorAll('a')).find(
      link => link.textContent?.includes('note.md')
    );
    expect(resourceLink).toBeDefined();
    await act(async () => resourceLink?.click());

    expectResourceSplit();
  });

  it('opens a tool-call resource argument in the Copilot split', async () => {
    await act(async () => {
      root.render(
        <ToolCallArgs
          args={[
            {
              key: 'resource_id',
              display: RESOURCE_ID,
              resourceId: RESOURCE_ID,
            },
          ]}
        />
      );
    });

    await act(async () => container.querySelector('a')?.click());

    expectResourceSplit();
  });
});
