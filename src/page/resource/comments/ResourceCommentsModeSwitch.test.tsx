/** @jest-environment jsdom */

import { act } from 'react';

import type { Resource } from '@/interface';
import Render from '@/page/resource/Render';
import { listResourceCommentThreads } from '@/service/resourceComments';

import {
  createResourceCommentsFixture,
  resource,
  thread,
} from './ResourceCommentsTestFixture';

jest.mock('@/hooks/useApp', () => ({
  __esModule: true,
  default: () => mockApp,
}));
const mockApp = { on: () => () => undefined };

jest.mock('react', () => {
  const react = jest.requireActual<typeof import('react')>('react');
  return { ...react, default: react };
});
jest.mock('./resourceComments.css', () => ({}));
jest.mock('@import-ai/omnibox-editor', () => ({}));
jest.mock('./commentAnchors', () => ({}));
jest.mock('./ResourceCommentsContext', () => ({
  useResourceCommentsPanel: jest.fn(),
}));
jest.mock('./useCommentMentionUsers', () => {
  const users: unknown[] = [];
  const namesById: Record<string, string> = {};
  return {
    useCommentMentionUsers: () => ({
      users,
      namesById,
      membersById: {},
      loaded: false,
    }),
  };
});
jest.mock('@/service/resourceComments', () => ({
  getResourceCommentThread: jest.fn(),
  listResourceCommentThreads: jest.fn(),
  updateResourceComment: jest.fn(),
  uploadResourceCommentAttachment: jest.fn(),
}));
jest.mock('@/page/resource/mentionLabelSync', () => ({
  syncCommentMentionLabels: jest.fn().mockResolvedValue({}),
}));
jest.mock('@/lib/request', () => ({ http: { get: jest.fn() } }));
jest.mock('@/components/attributes', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/components/Button', () =>
  jest.requireActual('@/components/ui/button')
);
jest.mock('@/page/resource/editor', () => ({
  __esModule: true,
  default: jest.fn(() => <span data-resource-comment-thread="thread" />),
}));
jest.mock('@/page/resource/Render', () => ({
  __esModule: true,
  default: jest.fn(() => <span data-resource-comment-thread="thread" />),
}));
jest.mock('@/page/resource/folder', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('react-router-dom', () => ({
  useLocation: jest.fn(),
  useSearchParams: () => [new URLSearchParams()],
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));

Object.assign(globalThis, {
  IS_REACT_ACT_ENVIRONMENT: true,
  ResizeObserver: class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
});

describe('resource comments across view and edit modes', () => {
  const fixture = createResourceCommentsFixture();
  const { render, readonlyComments, editorProps } = fixture;
  let source: HTMLDivElement;
  let panel: HTMLDivElement;

  beforeEach(() => {
    jest.useFakeTimers();
    fixture.setup();
    ({ source, panel } = fixture);
  });

  afterEach(async () => {
    await fixture.unmount();
    jest
      .mocked(Render)
      .mockImplementation(() => <span data-resource-comment-thread="thread" />);
    jest.restoreAllMocks();
    Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
    jest.clearAllMocks();
    jest.useRealTimers();
    localStorage.clear();
  });

  it('preserves the sidebar, selection, filter and scroll position without refetching', async () => {
    await render(false);
    await act(async () => readonlyComments().setResolved(false));
    await act(async () => readonlyComments().selectThread(thread.id));
    const card = panel.querySelector('[data-thread-id="thread"]');
    const scroll = panel.querySelector<HTMLElement>('[data-comments-scroll]');
    if (!card || !scroll) {
      throw new Error('The comments sidebar was not mounted');
    }
    scroll.scrollTop = 180;
    const requestCount = jest.mocked(listResourceCommentThreads).mock.calls
      .length;

    await render(true);

    expect(editorProps().comments.activeThreadId).toBe(thread.id);
    expect(editorProps().comments.resolved).toBe(false);
    expect(panel.querySelector('[data-thread-id="thread"]')).toBe(card);
    expect(panel.querySelector('[data-comments-scroll]')).toBe(scroll);
    expect(scroll.scrollTop).toBe(180);
    expect(panel.querySelector('[role="status"]')).toBeNull();
    expect(listResourceCommentThreads).toHaveBeenCalledTimes(requestCount);

    await render(false);

    expect(readonlyComments().activeThreadId).toBe(thread.id);
    expect(readonlyComments().resolved).toBe(false);
    expect(panel.querySelector('[data-thread-id="thread"]')).toBe(card);
    expect(scroll.scrollTop).toBe(180);
    expect(listResourceCommentThreads).toHaveBeenCalledTimes(requestCount);
  });

  it('shares the unsaved content state with the persistent comments controller', async () => {
    await render(false);
    await render(true);
    const visibleThreads = editorProps().comments.threads;
    await act(async () => editorProps().onContentDirtyChange(true));
    expect(editorProps().comments.threads).toBe(visibleThreads);
    expect(editorProps().comments.commentsConfig.enabled).toBe(false);
    expect(panel.textContent).toContain(
      'resource_comments.save_before_commenting'
    );

    await act(async () => editorProps().onContentDirtyChange(false));
    expect(editorProps().comments.threads).toBe(visibleThreads);
    expect(editorProps().comments.commentsConfig.enabled).toBe(true);
    expect(listResourceCommentThreads).toHaveBeenCalledTimes(2);
  });

  it.each([undefined, false])(
    'preserves sidebar comments and the %s filter after saving the document',
    async resolved => {
      await render(false);
      await act(async () => readonlyComments().setResolved(resolved));
      const card = panel.querySelector('[data-thread-id="thread"]');
      expect(card).not.toBeNull();
      const requestCount = jest.mocked(listResourceCommentThreads).mock.calls
        .length;
      await render(true);
      const savedThread = {
        ...thread,
        anchor: { ...thread.anchor, from: 10, to: 14 },
      };

      await render(false, {
        ...resource,
        content: 'New paragraph\nQuoted text',
        content_hash: 'saved-hash',
        comment_threads: [savedThread],
      });

      expect(readonlyComments().threads).toEqual([savedThread]);
      expect(readonlyComments().total).toBe(1);
      expect(readonlyComments().resolved).toBe(resolved);
      expect(panel.querySelector('[data-thread-id="thread"]')).toBe(card);
      expect(listResourceCommentThreads).toHaveBeenCalledTimes(requestCount);
    }
  );

  it('accepts an in-flight comment list when the same resource receives a new snapshot', async () => {
    let finishLoading: (() => void) | undefined;
    jest.mocked(listResourceCommentThreads).mockImplementationOnce(
      () =>
        new Promise(resolve => {
          finishLoading = () =>
            resolve({
              items: [thread],
              total: 1,
              has_more: false,
              offset: 0,
              limit: 20,
            });
        })
    );
    await render(false);
    await render(false, { ...resource, comment_threads: [{ ...thread }] });
    await act(async () => finishLoading?.());

    expect(readonlyComments().threads).toEqual([thread]);
    expect(readonlyComments().loading).toBe(false);
    expect(panel.querySelector('[data-thread-id="thread"]')).not.toBeNull();
  });
  it('disables comments and hides live threads while previewing history', async () => {
    await render(false);
    expect(readonlyComments().canComment).toBe(true);
    await render(
      false,
      { ...resource, read_only: true, content: 'Historical' },
      true
    );
    expect(readonlyComments().canComment).toBe(false);
    expect(readonlyComments().commentsConfig.enabled).toBe(false);
    expect(jest.mocked(Render).mock.lastCall?.[0].commentsDisabled).toBe(true);
    expect(panel.textContent).toBe('');
    expect(source.querySelector('.resource-document-comments')).toBeNull();
    await render(false);
    expect(readonlyComments().canComment).toBe(true);
    expect(jest.mocked(Render).mock.lastCall?.[0].commentsDisabled).toBe(false);
    expect(source.querySelector('.resource-document-comments')).not.toBeNull();
  });

  it.each<Resource['resource_type']>(['doc', 'file', 'link', 'rss_item'])(
    'includes the footer for an empty or body-read-only %s outside the export boundary',
    async resourceType => {
      await render(false, {
        ...resource,
        resource_type: resourceType,
        content: '',
        read_only: true,
      });
      const footer = source.querySelector('.resource-document-comments');
      expect(footer).not.toBeNull();
      expect(footer?.querySelector('textarea')).not.toBeNull();
      expect(footer?.closest('[data-resource-export-content]')).toBeNull();
    }
  );

  it.each<Resource['resource_type']>(['folder', 'smart_folder', 'rss_folder'])(
    'excludes the %s footer',
    async resourceType => {
      await render(false, { ...resource, resource_type: resourceType });
      expect(source.querySelector('.resource-document-comments')).toBeNull();
    }
  );

  it('preserves the document draft through actual Page read/edit branches', async () => {
    await render(false);
    await act(async () =>
      readonlyComments().documentDraft.setContent('Preserved draft')
    );
    await render(true);
    expect(editorProps().comments.documentDraft.content).toBe(
      'Preserved draft'
    );
    expect(source.querySelector('textarea')?.value).toBe('Preserved draft');
    await render(false);
    expect(readonlyComments().documentDraft.content).toBe('Preserved draft');
  });
});
