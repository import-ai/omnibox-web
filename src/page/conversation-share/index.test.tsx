/** @jest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import ConversationSharePage from '.';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('react-router-dom', () => ({
  useParams: () => ({ share_id: 'Ab3xYz90Qw12' }),
}));
jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children }: { children: string }) => <>{children}</>,
}));
jest.mock('remark-gfm', () => ({
  __esModule: true,
  default: () => undefined,
}));
jest.mock('@/assets/icons/ChatIcon', () => ({
  ChatIcon: () => <svg />,
}));
jest.mock('@/hooks/useTheme', () => ({
  __esModule: true,
  default: () => ({ theme: { content: 'light' } }),
}));
jest.mock('@/service/conversationShare', () => ({
  fetchConversationShare: () => new Promise(() => {}),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('ConversationSharePage', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
  });

  it('provides a scroll container inside the fixed app shell', async () => {
    await act(async () => {
      root.render(<ConversationSharePage />);
    });

    const page = container.querySelector('main');
    expect(page?.className).toContain('h-full');
    expect(page?.className).toContain('overflow-y-auto');
  });
});
