/** @jest-environment jsdom */
import { act, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { MessageDetailsContext } from '../../conversation/MessageDetailsContext';
import {
  MessageStatus,
  OpenAIMessageRole,
} from '../../core/types/chatResponse';
import type { MessageDetail } from '../../core/types/conversation';
import { CitationContext, MarkdownAnchor } from './CitationMarkdownAnchor';
jest.mock('react-router-dom', () => ({ useParams: () => ({}) }));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (s: string) => s }),
}));
jest.mock('@/page/chat/ChatRouteParamsContext', () => ({
  useChatRouteParams: () => ({ namespaceId: 'ns' }),
}));
jest.mock('@/page/chat/components/ChatResourceLink', () => ({
  ChatResourceLink: () => null,
}));
jest.mock('@/page/share/ShareChatOnlyContext', () => ({
  useShareChatOnly: () => false,
}));
jest.mock('@/page/chat/useChatResourceNavigation', () => ({
  useChatResourceNavigation: () => ({ openResource: () => false }),
}));
Object.assign(globalThis, {
  IS_REACT_ACT_ENVIRONMENT: true,
  ResizeObserver: class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
});
test.each(['focus', 'mouse'])(
  'citation %s survives detail hydration rerender',
  async mode => {
    jest.useFakeTimers();
    const citation = {
      id: 'C1',
      index: 0,
      source_message_id: 'tool',
      title: 'source',
      link: 'https://example.com',
    };
    let hydrate: () => void = () => {};
    function Harness() {
      const [loaded, setLoaded] = useState(false);
      const load = () =>
        new Promise<Record<string, MessageDetail>>(resolve => {
          hydrate = () => {
            setLoaded(true);
            resolve({
              tool: {
                id: 'tool',
                clientKey: 1,
                parent_id: '',
                children: [],
                status: MessageStatus.SUCCESS,
                message: { role: OpenAIMessageRole.TOOL },
                attrs: {
                  citations: [{ ...citation, snippet: 'full snippet' }],
                },
              },
            });
          };
        });
      return (
        <MessageDetailsContext.Provider value={load}>
          <CitationContext.Provider
            value={[
              { ...citation, ...(loaded ? { snippet: 'full snippet' } : {}) },
            ]}
          >
            <MarkdownAnchor href="#cite-1">1</MarkdownAnchor>
          </CitationContext.Provider>
        </MessageDetailsContext.Provider>
      );
    }
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(<Harness />);
    });
    const trigger = container.querySelector('button')!;
    await act(async () => {
      if (mode === 'focus') trigger.focus();
      else {
        const event = new Event('pointerover', { bubbles: true });
        Object.defineProperty(event, 'pointerType', { value: 'mouse' });
        trigger.dispatchEvent(event);
        const move = new Event('pointermove', { bubbles: true });
        Object.defineProperty(move, 'pointerType', { value: 'mouse' });
        trigger.dispatchEvent(move);
      }
      jest.advanceTimersByTime(1000);
    });
    expect(document.body.textContent).toContain('chat.history.loading_details');
    await act(async () => {
      hydrate();
    });
    expect(container.querySelector('button')).toBe(trigger);
    expect(document.body.textContent).toContain('full snippet');
    await act(async () => {
      root.unmount();
    });
    jest.useRealTimers();
  }
);
