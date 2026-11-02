/** @jest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import type { ResourceCommentThread } from '@/interface';

import { useResourceCommentsPanel } from './ResourceCommentsContext';
import { ResourceCommentThreadList } from './ResourceCommentThreadList';
import type { ResourceCommentsController } from './useResourceComments';

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  default: jest.requireActual('react'),
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('@/components/Button', () => ({ Button: () => null }));
jest.mock('./ResourceCommentsContext', () => ({
  useResourceCommentsPanel: jest.fn(),
}));
jest.mock('./useSelectedImageCommentThreads', () => ({
  useSelectedImageCommentThreads: () => [],
}));
jest.mock('./ResourceCommentThreadItem', () => ({
  ResourceCommentThreadItem: ({
    thread,
  }: {
    thread: ResourceCommentThread;
  }) => <div data-thread-id={thread.id} />,
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const thread: ResourceCommentThread = {
  id: 'inline',
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

describe('comment alignment after asynchronous document rendering', () => {
  let host: HTMLDivElement;
  let source: HTMLDivElement;
  let content: HTMLDivElement;
  let marker: HTMLSpanElement;
  let panel: HTMLDivElement;
  let root: Root;
  let markerTop: number;
  let resizeObservers: { targets: Set<Element>; notify: () => void }[];

  const flush = async () => {
    await act(async () => {});
    await act(async () => jest.advanceTimersByTime(50));
  };
  const cardTop = () =>
    parseFloat(
      panel.querySelector<HTMLElement>('[data-thread-id="inline"]')!
        .parentElement!.style.top
    );

  beforeEach(() => {
    jest.useFakeTimers();
    markerTop = 600;
    resizeObservers = [];
    globalThis.ResizeObserver = class {
      targets = new Set<Element>();
      constructor(callback: ResizeObserverCallback) {
        resizeObservers.push({
          targets: this.targets,
          notify: () => callback([], this),
        });
      }
      observe(target: Element) {
        this.targets.add(target);
      }
      unobserve(target: Element) {
        this.targets.delete(target);
      }
      disconnect() {
        this.targets.clear();
      }
    };
    host = document.createElement('div');
    source = document.createElement('div');
    source.setAttribute('data-resource-scroll', '');
    content = document.createElement('div');
    content.className = 'tiptap';
    marker = document.createElement('span');
    content.append(marker);
    source.append(content);
    panel = document.createElement('div');
    const commentsScroll = document.createElement('div');
    commentsScroll.setAttribute('data-comments-scroll', '');
    panel.append(commentsScroll);
    host.append(source, panel);
    document.body.append(host);
    root = createRoot(commentsScroll);
    jest.mocked(useResourceCommentsPanel).mockReturnValue({
      rootElement: host,
      panelElement: panel,
      panelOpen: true,
    } as ReturnType<typeof useResourceCommentsPanel>);
    jest
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function (this: HTMLElement) {
        const top = this === marker ? markerTop : 0;
        return {
          x: 0,
          y: top,
          top,
          bottom: top + 120,
          left: 0,
          right: 300,
          width: 300,
          height: 120,
          toJSON: () => ({}),
        };
      });
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  const render = async () => {
    await act(async () =>
      root.render(
        <ResourceCommentThreadList
          controller={
            { threads: [thread] } as unknown as ResourceCommentsController
          }
          loadMore={jest.fn()}
        />
      )
    );
    await flush();
  };

  it.each([false, true])(
    'moves a refreshed card to a delayed anchor, selected=%s',
    async selected => {
      await render();
      expect(cardTop()).toBe(0);

      if (selected) {
        panel
          .querySelector('[data-thread-id]')!
          .setAttribute('data-selected', '');
      }
      marker.setAttribute('data-resource-comment-thread', thread.id);
      await flush();

      expect(cardTop()).toBe(600);
    }
  );

  it.each([false, true])(
    'realigns after media loading without a viewport resize, editor remounted=%s',
    async remounted => {
      marker.setAttribute('data-resource-comment-thread', thread.id);
      await render();
      expect(cardTop()).toBe(600);

      if (remounted) {
        const previousContent = content;
        content = document.createElement('div');
        content.className = 'tiptap';
        content.append(marker);
        previousContent.replaceWith(content);
        await flush();
        expect(
          resizeObservers.some(observer =>
            observer.targets.has(previousContent)
          )
        ).toBe(false);
      }
      markerTop = 950;
      resizeObservers.forEach(observer => {
        if (observer.targets.has(content)) observer.notify();
      });
      await flush();

      expect(cardTop()).toBe(950);
    }
  );
});
