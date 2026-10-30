/** @jest-environment jsdom */

import { act } from 'react';
import { useLocation } from 'react-router-dom';

import Render from '@/page/resource/Render';
import {
  getResourceCommentThread,
  listResourceCommentThreads,
} from '@/service/resourceComments';

import { useResourceCommentsPanel } from './ResourceCommentsContext';
import {
  createResourceCommentsFixture,
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

describe('resource document comment permalinks', () => {
  const fixture = createResourceCommentsFixture();
  const { render, readonlyComments } = fixture;
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

  it.each([
    'smooth-scroll',
    'late-image',
    'cancel-selection',
    'cancel-panel',
    'new-link',
    'tall-card',
    'timeout',
    'interrupted-scroll',
    'cancel-wheel',
    'cancel-touch',
  ] as const)('handles a resolved document permalink during %s', async mode => {
    const target = {
      ...thread,
      id: 'document-target',
      type: 'document' as const,
      anchor: null,
      resolved: true,
    };
    jest.mocked(useLocation).mockReturnValue({
      ...useLocation(),
      key: 'document-link',
      hash: '#comment-document-target',
    });
    jest.mocked(getResourceCommentThread).mockResolvedValue(target);
    jest.mocked(listResourceCommentThreads).mockResolvedValue({
      items: [],
      total: 0,
      has_more: false,
      offset: 0,
      limit: 20,
    });
    let bodyBottom = mode === 'late-image' || mode === 'tall-card' ? 400 : 1800;
    let mediaLoaded = mode !== 'late-image';
    if (mode === 'late-image') {
      jest
        .mocked(Render)
        .mockImplementation(() => <img alt="Delayed document media" />);
      jest
        .spyOn(HTMLImageElement.prototype, 'complete', 'get')
        .mockImplementation(() => mediaLoaded);
      setTimeout(() => {
        mediaLoaded = true;
        bodyBottom = 1800;
        source.dispatchEvent(new Event('scroll', { bubbles: true }));
      }, 1000);
    }
    let scrollStarted = false;
    let scrollTimer: ReturnType<typeof setTimeout> | undefined;
    let boundaryScrollRequests = 0;
    const rect = (top: number, height: number) => ({
      x: 0,
      y: top,
      top,
      bottom: top + height,
      left: 0,
      right: 300,
      width: 300,
      height,
      toJSON: () => ({}),
    });
    const commentsScroll = () =>
      panel.querySelector<HTMLElement>('[data-comments-scroll]')!;
    const listTop = () => 80 - (commentsScroll()?.scrollTop ?? 0);
    jest
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function (this: HTMLElement) {
        if (this === source) return rect(0, 600);
        if (this.hasAttribute('data-resource-body-end'))
          return rect(bodyBottom, 0);
        if (this.hasAttribute('data-comments-scroll')) return rect(80, 400);
        if (this.classList.contains('resource-comments-anchored-list'))
          return rect(listTop(), 2000);
        if (this.hasAttribute('data-thread-id'))
          return rect(
            listTop() + parseFloat(this.parentElement?.style.top ?? '0'),
            mode === 'tall-card' ? 800 : 120
          );
        if (this.hasAttribute('data-document-comments-heading'))
          return rect(listTop() + parseFloat(this.style.top || '0'), 41);
        return rect(0, 0);
      });
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: function (this: HTMLElement) {
        if (!this.hasAttribute('data-resource-body-end')) return;
        boundaryScrollRequests += 1;
        if (mode === 'interrupted-scroll' && boundaryScrollRequests === 1)
          return;
        if (scrollStarted) return;
        scrollStarted = true;
        scrollTimer = setTimeout(
          () => {
            bodyBottom = 400;
            source.dispatchEvent(new Event('scroll', { bubbles: true }));
          },
          mode === 'timeout' ? 6000 : 1000
        );
      },
    });
    await render(false);
    const initialCommentsScroll = commentsScroll();
    Object.defineProperties(initialCommentsScroll, {
      clientHeight: { configurable: true, value: 400 },
      scrollHeight: { configurable: true, value: 3000 },
      scrollTo: {
        configurable: true,
        value: ({ top }: ScrollToOptions) => {
          commentsScroll().scrollTop = top ?? 0;
        },
      },
    });
    if (mode === 'cancel-selection') {
      await act(async () => readonlyComments().selectThread('other'));
    } else if (mode === 'cancel-panel') {
      jest.mocked(useResourceCommentsPanel).mockReturnValue({
        ...useResourceCommentsPanel()!,
        panelOpen: false,
      });
      await render(false);
    } else if (mode === 'cancel-wheel' || mode === 'cancel-touch') {
      expect(boundaryScrollRequests).toBe(1);
      clearTimeout(scrollTimer);
      scrollStarted = false;
      source.scrollTop = 100;
      bodyBottom = 1700;
      await act(async () => {
        source.dispatchEvent(
          mode === 'cancel-wheel'
            ? new WheelEvent('wheel', { bubbles: true, deltaY: -100 })
            : new Event('touchstart', { bubbles: true })
        );
        source.dispatchEvent(new Event('scroll', { bubbles: true }));
      });
    } else if (mode === 'new-link') {
      jest
        .mocked(getResourceCommentThread)
        .mockResolvedValue({ ...target, id: 'document-other' });
      jest.mocked(useLocation).mockReturnValue({
        ...useLocation(),
        key: 'other-link',
        hash: '#comment-document-other',
      });
      await render(false);
    }
    const duration = mode === 'timeout' ? 7600 : 2800;
    for (let elapsed = 0; elapsed < duration; elapsed += 16) {
      await act(async () => jest.advanceTimersByTime(16));
    }
    if (
      mode === 'cancel-wheel' ||
      mode === 'cancel-touch' ||
      mode === 'cancel-selection' ||
      mode === 'cancel-panel' ||
      mode === 'timeout'
    ) {
      expect(initialCommentsScroll.scrollTop).toBe(0);
      if (mode === 'cancel-wheel' || mode === 'cancel-touch') {
        expect(boundaryScrollRequests).toBe(1);
        expect(bodyBottom).toBe(1700);
      }
      if (mode === 'cancel-selection')
        expect(readonlyComments().activeThreadId).toBe('other');
      return;
    }
    const targetId = mode === 'new-link' ? 'document-other' : target.id;
    const card = panel.querySelector<HTMLElement>(
      `[data-thread-id="${targetId}"]`
    )!;
    const bounds = card.getBoundingClientRect();
    const viewport = commentsScroll().getBoundingClientRect();
    expect(readonlyComments().activeThreadId).toBe(targetId);
    expect(readonlyComments().resolved).toBe(true);
    expect(bounds.top).toBeGreaterThanOrEqual(viewport.top);
    if (mode === 'tall-card')
      expect(bounds.top).toBeLessThanOrEqual(viewport.top + 12);
    else expect(bounds.bottom).toBeLessThanOrEqual(viewport.bottom);
    jest.restoreAllMocks();
  });
});
