/** @jest-environment jsdom */
import { act } from 'react';
import { createRoot } from 'react-dom/client';

import { http } from '@/lib/request';
import { ChatMode, SendMessageParams } from '@/page/chat/chat-input/types';
import { ask } from '@/page/chat/conversation/utils';

import SharedChatConversationPage from './SharedChatConversationPage';
import SharedChatHomePage from './SharedChatHomePage';

let mockSend: (params: SendMessageParams) => Promise<void>;
let mockEdit: (id: string, content: string) => Promise<void>;
let mockRegenerate: (id: string) => Promise<void>;
const mockNavigate = jest.fn();
const mockStream = () => ({
  start: jest.fn().mockResolvedValue(undefined),
  cancel: jest.fn(),
  destroy: jest.fn(),
});
jest.mock('react-router-dom', () => ({
  useParams: () => ({ share_id: 'share', conversation_id: 'conversation' }),
  useNavigate: () => mockNavigate,
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));
jest.mock('@/components/resourcePicker', () => ({
  ShareResourcePicker: () => null,
}));
jest.mock('@/components/typewriter', () => ({ Typewriter: () => null }));
jest.mock('@/lib/utils', () => ({ setDocumentTitle: jest.fn() }));
jest.mock('@/lib/wizardLang', () => ({ getWizardLang: () => 'English' }));
jest.mock('@/lib/request', () => ({
  http: { post: jest.fn(), get: jest.fn() },
}));
jest.mock('@/page/chat/utils', () => ({ getGreeting: () => 'afternoon' }));
jest.mock('@/page/share', () => ({
  useShareContext: () => ({
    selectedResources: [],
    setSelectedResources: jest.fn(),
    mode: 'ask',
  }),
}));
jest.mock('@/page/chat/chat-input', () => ({
  __esModule: true,
  default: ({ sendMessage }: { sendMessage: typeof mockSend }) => {
    mockSend = sendMessage;
    return null;
  },
}));
jest.mock('@/page/chat/conversation/Scrollbar', () => ({
  __esModule: true,
  default: ({ children }: { children: unknown }) => children,
}));
jest.mock('@/page/chat/messages', () => ({
  Messages: ({
    onEdit,
    onRegenerate,
  }: {
    onEdit: typeof mockEdit;
    onRegenerate: typeof mockRegenerate;
  }) => {
    mockEdit = onEdit;
    mockRegenerate = onRegenerate;
    return null;
  },
}));
jest.mock('@/page/chat/messages/MessageIndex', () => ({
  MessageIndex: () => null,
}));
jest.mock('@/page/chat/core/messageOperator.ts', () => ({
  createMessageOperator: () => ({ getParent: () => 'user' }),
}));
jest.mock('@/page/chat/conversation/utils.ts', () => ({
  ask: jest.fn(() => mockStream()),
  resumeStream: () => mockStream(),
  stopStream: jest.fn(),
  getStreamEventId: jest.fn(),
  isTerminalMessageStatus: () => true,
  extractOriginalMessageSettings: () => ({
    originalTools: [],
    originalContext: [],
    originalLang: 'English',
    originalEnableThinking: false,
  }),
}));
(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

it('preserves shared home selection, ongoing selection, and original edit/regenerate strength', async () => {
  sessionStorage.clear();
  const container = document.createElement('div');
  let root = createRoot(container);
  const params: SendMessageParams = {
    query: 'Hi',
    tools: [],
    selectedResources: [],
    mode: ChatMode.ASK,
    edition: 'pro',
    level: 'max',
  };
  (http.post as jest.Mock).mockResolvedValue({ id: 'conversation' });
  (http.get as jest.Mock).mockResolvedValue({
    id: 'conversation',
    current_node: 'user',
    mapping: {
      user: {
        id: 'user',
        parent_id: '',
        children: [],
        message: { role: 'user', content: 'Hi' },
        attrs: { edition: 'pro', level: 'max' },
      },
    },
  });
  try {
    await act(async () => root.render(<SharedChatHomePage />));
    await act(async () => mockSend(params));
    expect(
      JSON.parse(sessionStorage.getItem('shared-chat-create-payload')!)
    ).toMatchObject({ edition: 'pro', level: 'max' });
    expect(mockNavigate).toHaveBeenCalledWith('/s/share/chat/conversation');
    await act(async () => root.unmount());
    root = createRoot(container);
    await act(async () => root.render(<SharedChatConversationPage />));
    expect(jest.mocked(ask).mock.calls.at(-1)?.slice(-2)).toEqual([
      'pro',
      'max',
    ]);
    await act(async () => root.unmount());
    root = createRoot(container);
    await act(async () => root.render(<SharedChatConversationPage />));
    await act(async () =>
      mockSend({ ...params, edition: 'basic', level: 'low' })
    );
    expect(jest.mocked(ask).mock.calls.at(-1)?.slice(-2)).toEqual([
      'basic',
      'low',
    ]);
    await act(async () => mockEdit('user', 'Updated'));
    expect(jest.mocked(ask).mock.calls.at(-1)?.slice(-2)).toEqual([
      'pro',
      'max',
    ]);
    await act(async () => mockRegenerate('assistant'));
    expect(jest.mocked(ask).mock.calls.at(-1)?.slice(-2)).toEqual([
      'pro',
      'max',
    ]);
  } finally {
    await act(async () => root.unmount());
    sessionStorage.clear();
  }
});
