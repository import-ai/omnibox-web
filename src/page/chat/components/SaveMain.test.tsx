/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import { http } from '@/lib/request';
import {
  getCopilotWorkspace,
  useCopilotStore,
} from '@/page/copilot/copilotStore';

import SaveMain from './SaveMain';

const fire = jest.fn();

jest.mock('@/hooks/useApp', () => ({
  __esModule: true,
  default: () => ({ fire }),
}));
jest.mock('@/lib/request', () => ({
  http: { get: jest.fn(), post: jest.fn() },
}));
jest.mock('@/page/chat/ChatRouteParamsContext', () => ({
  useChatRouteParams: () => ({
    compact: true,
    conversationId: 'conversation-a',
    namespaceId: 'namespace-a',
  }),
}));
jest.mock('react-router-dom', () => ({
  useParams: () => ({}),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('@/components/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => children,
  TooltipContent: ({ children }: { children: React.ReactNode }) => children,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => children,
}));

const mockedHttp = jest.mocked(http);

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('SaveMain', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    jest.clearAllMocks();
    useCopilotStore.setState({
      workspaces: {},
      pendingExpandFromResource: {},
    });
    useCopilotStore
      .getState()
      .showResourceBesideConversation(
        'namespace-a',
        'conversation-a',
        'Abcd1234Efgh5678'
      );
    mockedHttp.get
      .mockResolvedValueOnce({
        id: 'conversation-a',
        title: 'Conversation A',
        mapping: {},
      })
      .mockResolvedValueOnce({ id: 'private-root' });
    mockedHttp.post.mockResolvedValue({
      id: 'Zyxw9876Vuts5432',
      name: 'Conversation A',
      resource_type: 'doc',
    });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it('keeps the preview until generated-resource navigation commits', async () => {
    await act(async () => {
      root.render(
        <SaveMain
          content="Saved content"
          conversation={{ id: 'conversation-a', mapping: {} }}
        />
      );
    });

    await act(async () => {
      container.querySelector('button')?.click();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(
      getCopilotWorkspace(useCopilotStore.getState(), 'namespace-a')
        .previewResourceId
    ).toBe('Abcd1234Efgh5678');
    expect(fire).toHaveBeenCalledWith(
      'generate_resource',
      'private-root',
      expect.objectContaining({ id: 'Zyxw9876Vuts5432' })
    );
  });
});
