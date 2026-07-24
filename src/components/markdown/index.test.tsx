/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import Vditor from 'vditor';

import { Markdown } from './index';

const navigate = jest.fn();

jest.mock('vditor/dist/index.css', () => ({}));
jest.mock('@/styles/vditor-patch.css', () => ({}));
jest.mock('@/components/markdown/index.css', () => ({}));
jest.mock('@/const', () => ({
  LAZY_LOAD_IMAGE: false,
  VDITOR_CDN: '',
}));
jest.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
}));
jest.mock('@/hooks/useTheme', () => ({
  __esModule: true,
  default: () => ({
    theme: { code: 'github', content: 'light' },
  }),
}));
jest.mock('vditor', () => ({
  __esModule: true,
  default: {
    preview: jest.fn(
      (
        element: HTMLElement,
        content: string,
        options: { after?: () => void }
      ) => {
        element.innerHTML = content;
        options.after?.();
      }
    ),
  },
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('Markdown', () => {
  let container: HTMLDivElement;
  let root: Root;
  const createObjectURL = jest.fn(() => 'blob:notification-image');
  const revokeObjectURL = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectURL,
    });
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
  });

  it('opens rendered links in a new window when requested', async () => {
    await act(async () => {
      root.render(
        <Markdown
          content={
            '<a href="/internal">Internal</a><a href="https://example.com">External</a>'
          }
          openLinksInNewWindow
        />
      );
    });

    expect(Vditor.preview).toHaveBeenCalledTimes(1);
    container.querySelectorAll('a').forEach(link => {
      expect(link.target).toBe('_blank');
      expect(link.rel).toBe('noopener noreferrer');
    });
  });

  it('loads notification images with the bearer token', async () => {
    localStorage.setItem('token', 'mock-token');
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['image'], { type: 'image/png' }),
    } as Response);
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      value: fetchMock,
    });

    await act(async () => {
      root.render(
        <Markdown
          content={
            '<img src="/images/img-loading.svg" data-src="/api/v1/notification-assets/image.png"><img src="https://example.com/external.png">'
          }
          loadNotificationAssets
        />
      );
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/notification-assets/image.png',
      expect.objectContaining({
        credentials: 'omit',
        headers: { Authorization: 'Bearer mock-token' },
      })
    );
    const images = container.querySelectorAll('img');
    expect(images[0].getAttribute('data-src')).toBeNull();
    expect(images[0].src).toBe('blob:notification-image');
    expect(images[1].src).toBe('https://example.com/external.png');

    await act(async () => root.unmount());
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:notification-image');
    root = createRoot(container);
  });
});
