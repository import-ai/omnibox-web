/** @jest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { TooltipProvider } from '@/components/tooltip';
import type { Resource, ResourceCommentThread } from '@/interface';
import Editor from '@/page/resource/editor';
import Page from '@/page/resource/Page';
import Render from '@/page/resource/Render';
import { listResourceCommentThreads } from '@/service/resourceComments';

import { useResourceCommentsPanel } from './ResourceCommentsContext';

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
jest.mock('@/service/resourceComments', () => ({
  listResourceCommentThreads: jest.fn(),
}));
jest.mock('@/components/attributes', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/components/button', () =>
  jest.requireActual('@/components/ui/Button')
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
jest.mock('@/page/resource/resourceStore', () => ({
  useResourceStore: () => true,
  selectUseOmniboxEditor: jest.fn(),
}));
jest.mock('react-router-dom', () => ({
  useLocation: () => ({ key: 'resource', hash: '' }),
  useSearchParams: () => [new URLSearchParams()],
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const thread: ResourceCommentThread = {
  id: 'thread',
  quoted_text: 'Quoted text',
  resolved: false,
  anchor: {
    from: 1,
    to: 5,
    prefix: '',
    suffix: '',
    content_hash: 'hash',
    status: 'active',
  },
  creator: { id: 'author', username: 'Author' },
  comments: [],
  created_at: '2026-09-10T00:00:00Z',
  updated_at: '2026-09-10T00:00:00Z',
};
const resource: Resource = {
  id: 'resource',
  name: 'Document',
  resource_type: 'doc',
  space_type: 'private',
  parent_id: 'root',
  has_children: false,
  content: 'Quoted text',
  content_hash: 'hash',
  current_permission: 'can_comment',
  comment_threads: [thread],
};
const onResource = jest.fn();

describe('resource comments across view and edit modes', () => {
  let root: Root;
  let container: HTMLDivElement;
  let source: HTMLDivElement;
  let panel: HTMLDivElement;

  const render = async (editPage: boolean) => {
    await act(async () => {
      root.render(
        <TooltipProvider>
          <Page
            editPage={editPage}
            namespaceId="namespace"
            resource={resource}
            showToc
            wide={false}
            onResource={onResource}
          />
        </TooltipProvider>
      );
    });
    await act(async () => jest.advanceTimersByTime(100));
  };

  const readonlyComments = () => {
    const comments = jest.mocked(Render).mock.lastCall?.[0].comments;
    if (!comments) {
      throw new Error('The page did not provide its comments to the viewer');
    }
    return comments;
  };

  const editorProps = () => {
    const props = jest.mocked(Editor).mock.lastCall?.[0];
    if (!props) {
      throw new Error('The resource editor was not mounted');
    }
    return props;
  };

  beforeEach(() => {
    jest.useFakeTimers();
    container = document.createElement('div');
    source = document.createElement('div');
    source.setAttribute('data-resource-scroll', '');
    panel = document.createElement('div');
    container.append(source, panel);
    document.body.append(container);
    root = createRoot(source);
    jest.mocked(useResourceCommentsPanel).mockReturnValue({
      rootElement: container,
      panelElement: panel,
      panelOpen: true,
      namespaceId: 'namespace',
      setPanelOpen: jest.fn(),
      setPanelElement: jest.fn(),
      commentFocusOffset: 0,
      setCommentFocusOffset: jest.fn(),
    });
    jest.mocked(listResourceCommentThreads).mockResolvedValue({
      items: [thread],
      total: 1,
      has_more: false,
      offlet: 0,
      limits: 20,
    });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    jest.clearAllMocks();
    jest.useRealTimers();
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
    await act(async () => editorProps().onContentDirtyChange(true));
    expect(editorProps().comments.commentsConfig.enabled).toBe(false);
    expect(panel.textContent).toContain(
      'resource_comments.save_before_commenting'
    );

    await act(async () => editorProps().onContentDirtyChange(false));
    expect(editorProps().comments.commentsConfig.enabled).toBe(true);
    expect(panel.textContent).not.toContain(
      'resource_comments.save_before_commenting'
    );
    expect(listResourceCommentThreads).toHaveBeenCalledTimes(1);
  });
});
