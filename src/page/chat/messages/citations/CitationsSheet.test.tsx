/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import { ShareChatOnlyProvider } from '@/page/share/ShareChatOnlyContext';

import { CitationsSheet } from './CitationsSheet';

jest.mock('react-router-dom', () => ({
  useParams: () => ({ share_id: 'Share12345' }),
  useLocation: () => ({ pathname: '/s/Share12345' }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'zh-CN' },
  }),
}));

const citations = [
  {
    id: 'citation-a',
    title: 'Shared doc',
    snippet: 'Snippet body',
    link: 'Abcd1234Efgh5678',
  },
];

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('CitationsSheet', () => {
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
          <CitationsSheet index={0} citations={citations} />
        </ShareChatOnlyProvider>
      );
    });

  it('offers the citations trigger on an ordinary share', () => {
    render(false);
    expect(container.textContent).toContain('chat.citations');
  });

  it('renders nothing on a chat-only share', () => {
    render(true);
    expect(container.textContent).toBe('');
    expect(container.querySelector('button')).toBeNull();
  });
});
