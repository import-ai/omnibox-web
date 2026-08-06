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

  beforeEach(() => {
    jest.clearAllMocks();
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
});
