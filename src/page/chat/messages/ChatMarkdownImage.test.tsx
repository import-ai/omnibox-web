/** @jest-environment jsdom */

import { act } from 'react';
import { createRoot } from 'react-dom/client';

import { ShareChatOnlyProvider } from '@/page/share/ShareChatOnlyContext';

import { ChatMarkdownImage } from './ChatMarkdownImage';

jest.mock('react-router-dom', () => ({ useParams: () => ({}) }));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('@/page/chat/ImagePreviewDialog', () => ({
  ImagePreviewDialog: ({ open, src }: { open: boolean; src: string }) =>
    open ? <span role="dialog">{src}</span> : null,
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

test('previews images, preserves errors across stream renders, and hides chat-only images', async () => {
  const container = document.createElement('div');
  const root = createRoot(container);
  const src =
    '/api/v1/namespaces/QflKpu/resources/resource-id/attachments/image-id';
  const render = async (url = src, chatOnly = false) => {
    await act(async () =>
      root.render(
        <ShareChatOnlyProvider chatOnly={chatOnly}>
          <ChatMarkdownImage src={url} alt="Diagram" />
        </ShareChatOnlyProvider>
      )
    );
  };
  try {
    await render();
    expect(container.querySelector('img')?.getAttribute('src')).toBe(src);
    await act(async () => container.querySelector('button')?.click());
    expect(container.querySelector('[role="dialog"]')?.textContent).toBe(src);
    await act(async () =>
      container.querySelector('img')?.dispatchEvent(new Event('error'))
    );
    await render();
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('chat.image.load_failed');
    await render(src + '-2');
    expect(container.querySelector('img')).not.toBeNull();
    await render(src, true);
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toBe('Diagram');
  } finally {
    await act(async () => root.unmount());
  }
});
