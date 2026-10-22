/** @jest-environment jsdom */

import * as React from 'react';
import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { TextDecoder, TextEncoder } from 'util';

import { PendingDecisionNotRejected } from '@/page/chat/conversation/pendingDecisionSend';

import type ChatAreaComponent from './index';
import type { IResTypeContext } from './types';

// The real composer pulls in modules that expect these browser globals.
Object.assign(globalThis, { TextDecoder, TextEncoder });
type ChatAreaProps = React.ComponentProps<typeof ChatAreaComponent>;

// The real ChatInput and its composer effects run here; only the controls
// around it are stubbed.
let mockDropSpec: {
  drop: (item: unknown, monitor: { getItemType: () => string }) => void;
};

jest.mock('react-dnd', () => ({
  useDrop: (spec: typeof mockDropSpec) => {
    mockDropSpec = spec;
    return [{ isResourceOver: false }, jest.fn()];
  },
}));
jest.mock('react-dnd-html5-backend', () => ({ NativeTypes: { FILE: 'file' } }));
jest.mock('sonner', () => ({ toast: { error: jest.fn() } }));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('@/lib/request', () => ({
  http: { get: jest.fn().mockResolvedValue({}) },
}));
jest.mock('@/components/resourcePicker', () => ({
  WorkspaceResourcePicker: () => null,
}));
jest.mock('./ThinkingLevelSelector', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('./ApprovalModeSelect', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('./ContextCapacityIndicator', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('./DecisionInput', () => ({
  __esModule: true,
  default: () => <div data-testid="decision-card" />,
}));
jest.mock('./ChatTool', () => ({ __esModule: true, default: () => null }));
jest.mock('./ChatAction', () => ({
  __esModule: true,
  default: ({ onSend }: { onSend: () => void }) => (
    <button data-testid="send" onClick={onSend}>
      send
    </button>
  ),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
Object.defineProperty(globalThis, 'structuredClone', {
  configurable: true,
  value: <T,>(value: T): T => value,
});

const pendingMessages = [
  { message: { role: 'user', content: 'Do it' }, attrs: {} },
  {
    message: { role: 'assistant', content: '' },
    attrs: { tool_call: { interrupts: [{ id: 'approval' }] } },
  },
] as ChatAreaProps['messages'];

let addToChatBox: (resource: IResTypeContext) => void;
let setPageMessages: (messages: ChatAreaProps['messages']) => void;

function Page({ sendMessage }: { sendMessage: ChatAreaProps['sendMessage'] }) {
  // The chat store the conversation page uses for selected resources.

  const { useChatStore } = require('@/page/chat/chatStore');
  const resources: IResTypeContext[] = useChatStore(
    (state: { selectedResources: IResTypeContext[] }) => state.selectedResources
  );
  const setResources = (next: IResTypeContext[]) =>
    useChatStore.getState().setContext(next);
  addToChatBox = resource =>
    useChatStore.getState().addContext(resource.resource, resource.type);
  const [messages, setMessages] = React.useState(pendingMessages);
  setPageMessages = setMessages;

  const ChatArea: typeof ChatAreaComponent = require('./index').default;
  return (
    <ChatArea
      loading={false}
      messages={messages}
      navigatePrefix="/namespace-restore"
      selectedResources={resources}
      setSelectedResources={setResources}
      sendMessage={sendMessage}
      textWhilePending
    />
  );
}

describe('ChatArea draft restore with the real composer', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  const textarea = () =>
    container.querySelector('textarea') as HTMLTextAreaElement;

  async function type(text: string) {
    const element = textarea();
    const value = element.value + text;
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        'value'
      )!.set!.call(element, value);
      element.setSelectionRange(value.length, value.length);
      element.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  it('puts back both the resource mention and the typed text after a failed rejection', async () => {
    const sent: unknown[] = [];
    const sendMessage = jest.fn(async (params: unknown) => {
      sent.push(params);
      await new Promise(resolve => setTimeout(resolve, 0));
      throw new PendingDecisionNotRejected(false);
    });
    await act(async () => root.render(<Page sendMessage={sendMessage} />));

    await act(async () =>
      mockDropSpec.drop(
        { id: 'doc-1', name: 'Welcome', resource_type: 'doc' },
        { getItemType: () => 'card' }
      )
    );
    await type('一句话总结这个文档');
    const before = textarea().value;
    expect(before).toContain('Welcome');
    expect(before).toContain('一句话总结这个文档');

    await act(async () =>
      (container.querySelector('[data-testid="send"]') as HTMLElement).click()
    );
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(textarea().value).toBe(before);
  });

  it('puts back a resource added to the chat box together with the typed text', async () => {
    const sendMessage = jest
      .fn()
      .mockImplementationOnce(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
        throw new PendingDecisionNotRejected(false);
      })
      .mockResolvedValue(undefined);
    await act(async () => root.render(<Page sendMessage={sendMessage} />));

    await act(async () =>
      addToChatBox({
        type: 'resource',
        resource: { id: 'doc-1', name: 'Welcome', resource_type: 'doc' },
      } as unknown as IResTypeContext)
    );
    await type('一句话总结这个文档');
    const before = textarea().value;
    expect(before).toContain('Welcome');
    expect(before).toContain('一句话总结这个文档');

    await act(async () =>
      (container.querySelector('[data-testid="send"]') as HTMLElement).click()
    );
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(textarea().value).toBe(before);

    await act(async () =>
      (container.querySelector('[data-testid="send"]') as HTMLElement).click()
    );
    const resent = sendMessage.mock.calls[1][0] as { query: string };
    expect(resent.query.match(/一句话总结这个文档/g)).toHaveLength(1);
    expect(resent.query.match(/#doc-1/g)).toHaveLength(1);
  });

  it('puts the draft back while the decision bubble comes and goes', async () => {
    const decision = {
      message: { role: 'user', content: '' },
      attrs: {
        tool_call: { decisions: [{ type: 'reject' }], status: 'pending' },
        pending_query: true,
      },
    } as unknown as ChatAreaProps['messages'][number];
    const sendMessage = jest.fn(async () => {
      setPageMessages([...pendingMessages, decision]);
      await new Promise(resolve => setTimeout(resolve, 0));
      setPageMessages(pendingMessages);
      throw new PendingDecisionNotRejected(false);
    });
    await act(async () => root.render(<Page sendMessage={sendMessage} />));
    await act(async () =>
      addToChatBox({
        type: 'resource',
        resource: { id: 'doc-1', name: 'Welcome', resource_type: 'doc' },
      } as unknown as IResTypeContext)
    );
    await type('一句话总结这个文档');
    const before = textarea().value;

    await act(async () =>
      (container.querySelector('[data-testid="send"]') as HTMLElement).click()
    );
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(textarea().value).toBe(before);
  });
});
