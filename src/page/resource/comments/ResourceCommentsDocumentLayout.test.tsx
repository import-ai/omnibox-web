/** @jest-environment jsdom */

import { act } from 'react';

import Render from '@/page/resource/Render';
import { listResourceCommentThreads } from '@/service/resourceComments';

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

describe('resource document comment layout', () => {
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

  it.each([false, true])(
    'keeps resolved document cards below the body boundary with inline cards=%s',
    async includeInline => {
      let bodyBottom = 800;
      const commentsTop = 80;
      const focusShift = -140;
      const listTop = () =>
        commentsTop -
        (panel.querySelector<HTMLElement>('[data-comments-scroll]')
          ?.scrollTop ?? 0) +
        focusShift;
      jest
        .mocked(listResourceCommentThreads)
        .mockImplementation(async (_namespace, _resource, options) => ({
          items:
            options?.view === 'document'
              ? []
              : [
                  ...(includeInline ? [thread] : []),
                  {
                    ...thread,
                    id: 'document',
                    type: 'document',
                    anchor: null,
                    resolved: true,
                  },
                ],
          total: 2,
          offset: 0,
          limit: 20,
          has_more: false,
        }));
      jest
        .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
        .mockImplementation(function (this: HTMLElement) {
          const isSidebarHeading = this.hasAttribute(
            'data-document-comments-heading'
          );
          const top = this.hasAttribute('data-resource-body-end')
            ? bodyBottom
            : this.classList.contains('resource-comments-anchored-list')
              ? listTop()
              : isSidebarHeading
                ? listTop() + (parseFloat(this.style.top) || 0)
                : this.hasAttribute('data-thread-id')
                  ? listTop() + parseFloat(this.parentElement?.style.top ?? '0')
                  : this.hasAttribute('data-comments-scroll')
                    ? commentsTop
                    : 0;
          const height = isSidebarHeading ? 41 : 120;
          return {
            x: 0,
            y: top,
            top,
            bottom:
              top + (this.hasAttribute('data-resource-body-end') ? 0 : height),
            left: 0,
            right: 300,
            width: 300,
            height,
            toJSON: () => ({}),
          };
        });
      await render(false);
      const end = document.createElement('span');
      end.setAttribute('data-resource-body-end', '');
      source.append(end);
      await act(async () => readonlyComments().setResolved(undefined));
      await act(async () => jest.advanceTimersByTime(100));
      const wrapper = () =>
        panel.querySelector<HTMLElement>('[data-thread-id="document"]')
          ?.parentElement;
      const cardTop = () =>
        panel
          .querySelector<HTMLElement>('[data-thread-id="document"]')
          ?.getBoundingClientRect().top ?? Number.NaN;
      expect(cardTop()).toBeGreaterThanOrEqual(bodyBottom + 8);
      const commentsScroll = panel.querySelector<HTMLElement>(
        '[data-comments-scroll]'
      )!;
      const beforeSidebarScroll = cardTop();
      commentsScroll.scrollTop = 75;
      await act(async () =>
        commentsScroll.dispatchEvent(new Event('scroll', { bubbles: true }))
      );
      await act(async () => jest.advanceTimersByTime(100));
      expect(cardTop()).toBe(beforeSidebarScroll - 75);
      await act(async () => readonlyComments().selectThread('document'));
      const beforeResize = cardTop();
      await act(async () => window.dispatchEvent(new Event('resize')));
      await act(async () => jest.advanceTimersByTime(100));
      expect(cardTop()).toBe(beforeResize);
      bodyBottom = 1100;
      await act(async () => window.dispatchEvent(new Event('resize')));
      await act(async () => jest.advanceTimersByTime(100));
      expect(cardTop() + commentsScroll.scrollTop).toBeGreaterThanOrEqual(
        bodyBottom + 8
      );
      if (!includeInline) {
        bodyBottom = -200;
        await act(async () =>
          source.dispatchEvent(new Event('scroll', { bubbles: true }))
        );
        await act(async () => jest.advanceTimersByTime(100));
        expect(parseFloat(wrapper()?.style.top ?? '0')).toBeLessThan(0);
      }
      jest.restoreAllMocks();
    }
  );

  it('keeps the second resolved document card centered after repeated layout updates', async () => {
    const commentsTop = 80;
    const focusShift = -140;
    const listTop = () =>
      commentsTop -
      (panel.querySelector<HTMLElement>('[data-comments-scroll]')?.scrollTop ??
        0) +
      focusShift;
    jest
      .mocked(listResourceCommentThreads)
      .mockImplementation(async (_namespace, _resource, options) => ({
        items:
          options?.view === 'document'
            ? []
            : ['document-first', 'document-second'].map((id, index) => ({
                ...thread,
                id,
                type: 'document' as const,
                anchor: null,
                resolved: true,
                created_at: `2026-09-${10 + index}T00:00:00Z`,
              })),
        total: 2,
        offset: 0,
        limit: 20,
        has_more: false,
      }));
    jest
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function (this: HTMLElement) {
        const heading = this.hasAttribute('data-document-comments-heading');
        const top = this.hasAttribute('data-resource-body-end')
          ? 400
          : this.classList.contains('resource-comments-anchored-list')
            ? listTop()
            : heading
              ? listTop() + (parseFloat(this.style.top) || 0)
              : this.hasAttribute('data-thread-id')
                ? listTop() + parseFloat(this.parentElement?.style.top ?? '0')
                : this.hasAttribute('data-comments-scroll')
                  ? commentsTop
                  : 0;
        const height = heading
          ? 41
          : this.hasAttribute('data-thread-id')
            ? 120
            : this.hasAttribute('data-resource-body-end')
              ? 0
              : this.hasAttribute('data-comments-scroll')
                ? 400
                : 600;
        return {
          x: 0,
          y: top,
          top,
          bottom: top + height,
          left: 0,
          right: 300,
          width: 300,
          height,
          toJSON: () => ({}),
        };
      });
    await render(false);
    const boundary = document.createElement('span');
    boundary.setAttribute('data-resource-body-end', '');
    source.append(boundary);
    await act(async () => readonlyComments().setResolved(true));
    await act(async () => jest.advanceTimersByTime(100));
    const commentsScroll = panel.querySelector<HTMLElement>(
      '[data-comments-scroll]'
    )!;
    Object.defineProperties(commentsScroll, {
      clientHeight: { configurable: true, value: 400 },
      scrollHeight: { configurable: true, value: 1600 },
      scrollTo: {
        configurable: true,
        value: ({ top }: ScrollToOptions) => {
          commentsScroll.scrollTop = top ?? 0;
        },
      },
    });
    await act(async () =>
      readonlyComments().focusThread('document-second', {
        centerResolvedDocumentComment: true,
        openReply: false,
      })
    );
    await act(async () => jest.advanceTimersByTime(100));
    const card = panel.querySelector<HTMLElement>(
      '[data-thread-id="document-second"]'
    )!;
    const center = () => {
      const bounds = card.getBoundingClientRect();
      return (bounds.top + bounds.bottom) / 2;
    };
    expect(center()).toBe(280);
    const initialTop = card.parentElement?.style.top;
    for (let index = 0; index < 3; index += 1) {
      await act(async () => window.dispatchEvent(new Event('resize')));
      await act(async () => jest.advanceTimersByTime(100));
      expect(center()).toBe(280);
      expect(card.parentElement?.style.top).toBe(initialTop);
    }
    jest.restoreAllMocks();
  });

  it.each([
    [false, false],
    [false, true],
    [true, false],
    [true, true],
  ])(
    'labels the resolved document group below inline cards=%s with a footer title=%s',
    async (includeInline, hasFooterTitle) => {
      const documentThread = {
        ...thread,
        id: 'document',
        type: 'document' as const,
        anchor: null,
        resolved: true,
      };
      jest
        .mocked(listResourceCommentThreads)
        .mockImplementation(async (_namespace, _resource, options) => ({
          items:
            options?.view === 'document'
              ? hasFooterTitle
                ? [{ ...documentThread, id: 'unresolved', resolved: false }]
                : []
              : [...(includeInline ? [thread] : []), documentThread],
          total: 2,
          offset: 0,
          limit: 20,
          has_more: false,
        }));
      jest
        .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
        .mockImplementation(function (this: HTMLElement) {
          const isFooterHeading = this.classList.contains(
            'resource-document-comments__title'
          );
          const isSidebarHeading = this.hasAttribute(
            'data-document-comments-heading'
          );
          const top = this.hasAttribute('data-resource-body-end')
            ? 500
            : isSidebarHeading
              ? parseFloat(this.style.top) || 0
              : this.hasAttribute('data-thread-id')
                ? parseFloat(this.parentElement?.style.top ?? '0') || 0
                : this.hasAttribute('data-resource-comment-thread')
                  ? 600
                  : 0;
          const height =
            isFooterHeading || isSidebarHeading
              ? 41
              : this.hasAttribute('data-resource-body-end')
                ? 0
                : 120;
          return {
            x: 0,
            y: top,
            top,
            bottom: top + height,
            left: 0,
            right: 300,
            width: 300,
            height,
            toJSON: () => ({}),
          };
        });
      await render(false);
      await act(async () => readonlyComments().setResolved(undefined));
      await act(async () => jest.advanceTimersByTime(100));

      const heading = panel.querySelector<HTMLElement>(
        '[data-document-comments-heading]'
      );
      expect(heading?.textContent).toBe('resource_comments.document_title');
      const firstCard = panel.querySelector<HTMLElement>(
        '[data-thread-id="document"]'
      )!;
      expect(firstCard.getBoundingClientRect().top).toBeGreaterThanOrEqual(
        (heading?.getBoundingClientRect().bottom ?? Number.NaN) + 8
      );
      if (includeInline) {
        const inline = panel.querySelector<HTMLElement>(
          '[data-thread-id="thread"]'
        )!;
        expect(heading?.getBoundingClientRect().top).toBeGreaterThanOrEqual(
          inline.getBoundingClientRect().bottom + 16
        );
      } else {
        expect(heading?.getBoundingClientRect().top).toBe(500);
        if (hasFooterTitle) {
          expect(heading?.getBoundingClientRect().bottom).toBe(
            source
              .querySelector('.resource-document-comments__title')
              ?.getBoundingClientRect().bottom
          );
        }
      }
      jest.restoreAllMocks();
    }
  );

  it('omits the resolved document heading when the sidebar only has inline cards', async () => {
    await render(false);
    expect(panel.querySelector('[data-thread-id="thread"]')).not.toBeNull();
    expect(panel.querySelector('[data-document-comments-heading]')).toBeNull();
  });
});
