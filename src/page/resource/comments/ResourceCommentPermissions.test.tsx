/** @jest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { TooltipProvider } from '@/components/tooltip';
import type { Permission, ResourceCommentThread } from '@/interface';
import {
  listResourceCommentThreads,
  uploadResourceCommentAttachment,
} from '@/service/resourceComments';

import { ResourceCommentThreadItem } from './ResourceCommentThreadItem';
import { useResourceComments } from './useResourceComments';

jest.mock('react', () => {
  const react = jest.requireActual<typeof import('react')>('react');
  return { ...react, default: react };
});

jest.mock('@import-ai/omnibox-editor', () => ({}));
jest.mock('react-router-dom', () => ({
  useLocation: () => ({ key: 'default', hash: '' }),
}));
jest.mock('@/components/button', () =>
  jest.requireActual('@/components/ui/Button')
);
jest.mock('@/service/resourceComments', () => ({
  listResourceCommentThreads: jest.fn(),
  uploadResourceCommentAttachment: jest.fn(),
}));
jest.mock('./commentAnchors', () => ({}));
jest.mock('./ResourceCommentsContext', () => ({
  useResourceCommentsPanel: () => null,
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));
Object.assign(globalThis, {
  IS_REACT_ACT_ENVIRONMENT: true,
  ResizeObserver: jest.fn(() => ({
    observe: jest.fn(),
    disconnect: jest.fn(),
    unobserve: jest.fn(),
  })),
});
Object.assign(URL, {
  createObjectURL: jest.fn(() => 'blob:comment-image'),
  revokeObjectURL: jest.fn(),
});

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
  comments: [
    {
      id: 'comment',
      content: 'Original comment',
      author: { id: 'author', username: 'Author' },
      created_at: '2026-09-10T00:00:00Z',
      updated_at: '2026-09-10T00:00:00Z',
    },
  ],
  created_at: '2026-09-10T00:00:00Z',
  updated_at: '2026-09-10T00:00:00Z',
};
const threads = [thread];

function Fixture({
  permission,
  namespaceId = 'namespace',
}: {
  permission: Permission;
  namespaceId?: string;
}) {
  const controller = useResourceComments({
    namespaceId,
    resource: {
      id: 'team-document',
      current_permission: permission,
      comment_threads: threads,
    },
    enabled: true,
  });
  return (
    <TooltipProvider>
      <output data-can-create={controller.commentsConfig.enabled} />
      <ResourceCommentThreadItem
        controller={controller}
        mode="all"
        thread={thread}
      />
    </TooltipProvider>
  );
}

describe('comment permissions', () => {
  let root: Root;
  let container: HTMLDivElement;
  const button = (action: string) =>
    container.querySelector<HTMLButtonElement>(
      `button[aria-label="resource_comments.${action}"]`
    );
  const render = async (permission: Permission, namespaceId?: string) => {
    await act(async () =>
      root.render(<Fixture permission={permission} namespaceId={namespaceId} />)
    );
  };
  const selectComment = async () => {
    await act(async () =>
      container.querySelector<HTMLElement>('article')?.click()
    );
  };

  beforeEach(() => {
    localStorage.setItem('uid', 'author');
    jest.mocked(listResourceCommentThreads).mockResolvedValue({
      items: threads,
      total: 1,
      offlet: 0,
      limits: 20,
      has_more: false,
    });
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    localStorage.removeItem('uid');
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it.each(['edit', 'reply'])(
    'resizes %s text after attaching an image and deleting lines',
    async mode => {
      jest
        .spyOn(HTMLElement.prototype, 'scrollHeight', 'get')
        .mockImplementation(function (this: HTMLElement) {
          if (this instanceof HTMLTextAreaElement) {
            return this.value.split('\n').length * 20 + 16;
          }
          return 0;
        });
      await render('can_comment');
      if (mode === 'edit') {
        await act(async () => button('edit')?.click());
      } else {
        await selectComment();
      }
      const composerSelector =
        mode === 'edit'
          ? '.omnibox-comment-composer--edit'
          : '.omnibox-comment-reply';
      const input = container.querySelector<HTMLTextAreaElement>(
        `${composerSelector} textarea`
      );
      if (!input) {
        throw new Error('Missing comment edit textarea');
      }
      const setValue = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        'value'
      )?.set;
      if (!setValue) {
        throw new Error('Missing textarea value setter');
      }
      expect(input.rows).toBe(1);
      expect(input.style.height).toBe('38px');
      const fileInput = container.querySelector<HTMLInputElement>(
        `${composerSelector} input[type="file"]`
      );
      if (!fileInput) {
        throw new Error('Missing comment image input');
      }
      const file = new File(['image'], 'comment.png', { type: 'image/png' });
      jest.mocked(uploadResourceCommentAttachment).mockResolvedValue({
        id: 'image',
        url: 'blob:comment-image',
        name: file.name,
        mimetype: file.type,
        size: file.size,
      });
      Object.defineProperty(fileInput, 'files', { value: [file] });
      await act(async () => {
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      });
      expect(container.querySelector(`${composerSelector} img`)).not.toBeNull();
      await act(async () => {
        setValue.call(input, 'First line\nSecond line\nThird line');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      expect(input.style.height).toBe('78px');
      await act(async () => {
        setValue.call(input, 'Single line');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      expect(input.style.height).toBe('38px');
      expect(container.querySelector(`${composerSelector} img`)).not.toBeNull();
    }
  );

  it.each<Permission>(['no_access', 'can_view'])(
    'prevents an author from modifying previous comments with %s permission',
    async permission => {
      await render(permission);
      await selectComment();
      expect(container.textContent).toContain('Original comment');
      expect(button('edit')).toBeNull();
      expect(button('delete')).toBeNull();
      expect(button('resolve')).toBeNull();
      expect(container.querySelector('textarea')).toBeNull();
      expect(
        container.querySelector('output')?.getAttribute('data-can-create')
      ).toBe('false');
    }
  );

  it.each<Permission>(['can_comment', 'can_edit', 'full_access'])(
    'allows an author to manage comments with %s permission',
    async permission => {
      await render(permission);
      expect(button('edit')).not.toBeNull();
      expect(button('delete')).not.toBeNull();
      expect(button('resolve')).not.toBeNull();
      expect(
        container.querySelector('output')?.getAttribute('data-can-create')
      ).toBe('true');
      await selectComment();
      expect(container.querySelector('textarea')).not.toBeNull();
    }
  );

  it('exits an active edit when comment permission is revoked', async () => {
    await render('can_comment');
    await act(async () => button('edit')?.click());
    expect(
      container.querySelector('.omnibox-comment-composer--edit textarea')
    ).not.toBeNull();
    await render('can_view');
    expect(container.querySelector('textarea')).toBeNull();
    expect(button('edit')).toBeNull();
    expect(button('delete')).toBeNull();
    expect(container.textContent).toContain('Original comment');
    await render('can_comment');
    expect(
      container.querySelector('.omnibox-comment-composer--edit')
    ).toBeNull();
    expect(button('edit')).not.toBeNull();
  });

  it('does not grant moderation of other authors to commenters', async () => {
    localStorage.setItem('uid', 'other');
    await render('can_comment');
    expect(button('edit')).toBeNull();
    expect(button('delete')).toBeNull();
    expect(button('resolve')).toBeNull();
  });

  it('keeps resource editors able to delete and resolve, but not rewrite another author', async () => {
    localStorage.setItem('uid', 'editor');
    await render('can_edit');
    expect(button('edit')).toBeNull();
    expect(button('delete')).not.toBeNull();
    expect(button('resolve')).not.toBeNull();
  });

  it('keeps shared comments read-only even for their author', async () => {
    await render('full_access', 'share:share-id');
    expect(button('edit')).toBeNull();
    expect(button('delete')).toBeNull();
    expect(button('resolve')).toBeNull();
    expect(
      container.querySelector('output')?.getAttribute('data-can-create')
    ).toBe('false');
  });
});
