/** @jest-environment jsdom */

import copy from 'copy-to-clipboard';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { TooltipProvider } from '@/components/tooltip';
import { ToolType } from '@/page/chat/chat-input/types';
import {
  MessageStatus,
  OpenAIMessageRole,
} from '@/page/chat/core/types/chatResponse';
import type { MessageDetail } from '@/page/chat/core/types/conversation';
import {
  getCopilotWorkspace,
  useCopilotStore,
} from '@/page/copilot/copilotStore';
import { fetchResourcesByIds } from '@/service/resource';

import { cacheMessageDisplayParts } from '../messageDisplayPartsCache';
import { UserMessage } from './UserMessage';

jest.mock('react-router-dom', () => ({
  useParams: () => ({ namespace_id: 'n1', conversation_id: 'conversation-1' }),
  useLocation: () => ({ pathname: '/n1/chat/conversation-1' }),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => (key === 'untitled' ? '未命名' : key),
  }),
}));
jest.mock('@/service/resource', () => ({ fetchResourcesByIds: jest.fn() }));
jest.mock('@/service/share', () => ({ fetchShareResource: jest.fn() }));
jest.mock('@/lib/request', () => ({ __esModule: true, default: {} }));
jest.mock('copy-to-clipboard', () => ({
  __esModule: true,
  default: jest.fn(),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function historyMessage(
  content = '[未命名](#r1) 和 [未命名](#r2) 请总结'
): MessageDetail {
  return {
    id: 'message-1',
    clientKey: 1,
    parent_id: '',
    children: [],
    message: { role: OpenAIMessageRole.USER, content },
    status: MessageStatus.SUCCESS,
    attrs: {
      tools: [
        {
          name: ToolType.PRIVATE_SEARCH,
          resources: [
            { id: 'r1', name: '', type: 'resource' },
            { id: 'r2', name: '', type: 'resource' },
          ],
        },
      ],
      user_context: { selected_resources: ['r1', 'r2'] },
    },
  };
}

describe('UserMessage resource history', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    sessionStorage.clear();
    useCopilotStore.setState({ workspaces: {} });
    jest.mocked(fetchResourcesByIds).mockResolvedValue([]);
    jest.mocked(copy).mockReset().mockReturnValue(false);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    jest.restoreAllMocks();
  });

  async function renderMessage(message = historyMessage()) {
    await act(async () =>
      root.render(
        <UserMessage hideActions message={message} onEdit={() => {}} />
      )
    );
  }

  it('renders cache-free unnamed references and opens the selected resource', async () => {
    await renderMessage();
    const links = Array.from(container.querySelectorAll('a'));
    expect(
      links.map(link => [link.textContent, link.getAttribute('href')])
    ).toEqual([
      ['未命名', '/n1/r1'],
      ['未命名', '/n1/r2'],
    ]);
    expect(container.textContent).not.toContain('](#');
    expect(container.textContent).not.toContain(
      'chat.messages.user_context.selected_resources'
    );
    await act(async () =>
      links[1].dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true })
      )
    );
    expect(
      getCopilotWorkspace(useCopilotStore.getState(), 'n1').previewResourceId
    ).toBe('r2');
  });

  it('uses the translated fallback for an empty label in cached display parts', async () => {
    cacheMessageDisplayParts('message-1', [
      { type: 'resource', resource: { id: 'r2', name: '', type: 'resource' } },
      { type: 'text', text: ' 请总结' },
    ]);
    await renderMessage();
    expect(container.querySelector('a')?.textContent).toBe('未命名');
    expect(container.querySelector('a')?.getAttribute('href')).toBe('/n1/r2');
    expect(container.textContent).toBe('未命名 请总结');
  });

  it('keeps known references clickable when metadata loading fails', async () => {
    jest
      .mocked(fetchResourcesByIds)
      .mockRejectedValue(new Error('Unavailable'));
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    await renderMessage();
    expect(container.querySelectorAll('a')).toHaveLength(2);
    expect(error).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Failed to load user message resource metadata',
      })
    );
  });

  it.each(['history', 'cache', 'persisted'] as const)(
    'copies resource IDs and translated empty labels from %s',
    async source => {
      const message = historyMessage('[](#r1) [](#r2)');
      const displayParts =
        message.attrs!.tools![0].name === ToolType.PRIVATE_SEARCH
          ? message.attrs!.tools![0].resources!.map(resource => ({
              type: 'resource' as const,
              resource,
            }))
          : [];
      if (source === 'cache')
        cacheMessageDisplayParts(message.id, displayParts);
      if (source === 'persisted')
        message.attrs!.composer = { display_parts: displayParts };
      await act(async () =>
        root.render(
          <TooltipProvider>
            <UserMessage message={message} onEdit={() => {}} />
          </TooltipProvider>
        )
      );
      expect(
        Array.from(container.querySelectorAll('a')).map(
          link => link.textContent
        )
      ).toEqual(['未命名', '未命名']);
      await act(async () =>
        container.querySelector('svg.lucide-copy')!.closest('button')!.click()
      );
      const data = { clearData: jest.fn(), setData: jest.fn() };
      const [plainText, options] = jest.mocked(copy).mock.calls[0];
      options!.onCopy!(data);
      expect(plainText).toBe('[](#r1) [](#r2)');
      const html = data.setData.mock.calls.find(
        ([type]) => type === 'text/html'
      )![1];
      expect(html).toContain('data-resource-id="r1"');
      expect(html).toContain('data-resource-id="r2"');
      expect(html.match(/data-label="未命名"/g)).toHaveLength(2);
    }
  );
});
