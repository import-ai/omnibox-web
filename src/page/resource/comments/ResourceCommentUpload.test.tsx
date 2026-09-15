/** @jest-environment jsdom */

import { Editor, Node } from '@tiptap/core';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { toast } from 'sonner';

import { TooltipProvider } from '@/components/tooltip';
import type { ResourceComment, ResourceCommentAttachment } from '@/interface';

import { ResourceCommentComposer } from './ResourceCommentComposer';
import { ResourceCommentItem } from './ResourceCommentItem';
import { ResourceCommentReplyComposer } from './ResourceCommentReplyComposer';
import { useCommentDraftPosition } from './useCommentDraftPosition';
import { useResourceComments } from './useResourceComments';

jest.mock('react', () => {
  const react = jest.requireActual<typeof import('react')>('react');
  return { ...react, default: react };
});
jest.mock('@import-ai/omnibox-editor', () => ({}));
jest.mock('./ResourceCommentsContext', () => ({
  useResourceCommentsPanel: () => null,
}));
jest.mock('./useCommentDraftPosition', () => ({
  useCommentDraftPosition: jest.fn(() => 0),
}));
jest.mock('react-router-dom', () => ({
  useLocation: () => ({ key: 'default', hash: '' }),
}));
jest.mock('@/service/resourceComments', () => ({}));
jest.mock('./commentAnchors', () => ({}));
jest.mock('@/components/button', () =>
  jest.requireActual('@/components/ui/Button')
);
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));
jest.mock('sonner', () => ({ toast: { error: jest.fn() } }));
Object.assign(globalThis, {
  IS_REACT_ACT_ENVIRONMENT: true,
  ResizeObserver: jest.fn(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  })),
});

function deferredUpload() {
  let resolve: (value: ResourceCommentAttachment) => void = () => {};
  let reject: (error: Error) => void = () => {};
  const promise = new Promise<ResourceCommentAttachment>((success, failure) => {
    resolve = success;
    reject = failure;
  });
  return { promise, resolve, reject };
}
const attachment: ResourceCommentAttachment = {
  id: 'image',
  url: '/image.png',
  name: 'image.png',
  mimetype: 'image/png',
  size: 20,
};
const comment: ResourceComment = {
  id: 'comment',
  content: 'Text',
  author: { id: 'author', username: 'Author' },
  created_at: '2026-09-10T00:00:00Z',
  updated_at: '2026-09-10T00:00:00Z',
};
const upload = jest.fn<Promise<ResourceCommentAttachment>, [File]>();
const create = jest.fn(() => Promise.resolve(true));
const edit = jest.fn(() => Promise.resolve(undefined));
const reply = jest.fn<Promise<void>, [string[]?]>();
const setPendingSelection = jest.fn();
let editor: Editor;
let pendingSelection: {
  editor: Editor;
  from: number;
  to: number;
  quotedText: string;
};
type Mode = 'create' | 'edit' | 'reply';

function Fixture({ mode }: { mode: Mode }) {
  const controller = useResourceComments({
    namespaceId: 'namespace',
    resource: { id: 'resource' },
    enabled: false,
  });
  const props = {
    ...controller,
    canComment: true,
    uploadCommentImage: upload,
    createThread: create,
    editComment: edit,
    canEditComment: () => true,
    pendingSelection,
    setPendingSelection,
  };
  return (
    <TooltipProvider>
      {mode === 'create' ? (
        <ResourceCommentComposer controller={props} />
      ) : mode === 'edit' ? (
        <ResourceCommentItem
          comment={comment}
          threadId="thread"
          threadResolved={false}
          controller={props}
        />
      ) : (
        <ResourceCommentReplyComposer
          reply="Text"
          submitting={false}
          onChange={jest.fn()}
          onCancel={jest.fn()}
          onSubmit={reply}
          onUploadImage={upload}
        />
      )}
    </TooltipProvider>
  );
}

describe('comment upload races', () => {
  let root: Root;
  let container: HTMLDivElement;
  let urlIndex = 0;
  const input = () => {
    const element =
      container.querySelector<HTMLInputElement>('input[type="file"]');
    if (!element) {
      throw new Error('Missing image input');
    }
    return element;
  };
  const submit = () => {
    const element = container.querySelector<HTMLButtonElement>(
      '.omnibox-comment-submit'
    );
    if (!element) {
      throw new Error('Missing submit button');
    }
    return element;
  };
  const attach = async () => {
    const element = input();
    Object.defineProperty(element, 'files', {
      configurable: true,
      value: [new File(['image'], 'image.png', { type: 'image/png' })],
    });
    await act(async () =>
      element.dispatchEvent(new Event('change', { bubbles: true }))
    );
  };
  const paste = async (files: File[], useItems = false, text = '') => {
    const textarea = container.querySelector('textarea');
    if (!textarea) {
      throw new Error('Missing comment textarea');
    }
    const event = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', {
      value: {
        files: useItems ? [] : files,
        items: files.map(file => ({
          kind: 'file',
          type: file.type,
          getAsFile: () => file,
        })),
        getData: () => text,
      },
    });
    await act(async () => textarea.dispatchEvent(event));
    return event;
  };
  const render = async (mode: Mode, content: string | null = 'Text') => {
    await act(async () => root.render(<Fixture mode={mode} />));
    if (mode === 'edit') {
      await act(async () =>
        container
          .querySelector<HTMLButtonElement>(
            '[aria-label="resource_comments.edit"]'
          )
          ?.click()
      );
    }
    const textarea = container.querySelector('textarea');
    const setter = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      'value'
    )?.set;
    if (!textarea || !setter) {
      throw new Error('Missing textarea');
    }
    if (content !== null) {
      await act(async () => {
        setter.call(textarea, content);
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      });
    }
  };
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useCommentDraftPosition).mockReturnValue(0);
    reply.mockResolvedValue();
    urlIndex = 0;
    Object.assign(URL, {
      createObjectURL: jest.fn(() => `blob:image-${++urlIndex}`),
      revokeObjectURL: jest.fn(),
    });
    editor = new Editor({
      extensions: [
        Node.create({ name: 'doc', topNode: true, content: 'text*' }),
        Node.create({ name: 'text', group: 'inline' }),
      ],
    });
    pendingSelection = { editor, from: 0, to: 4, quotedText: 'Text' };
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    jest.useRealTimers();
    container.remove();
    editor.destroy();
  });

  describe('create draft dismissal', () => {
    it('focuses the input after the draft position is ready', async () => {
      jest.mocked(useCommentDraftPosition).mockReturnValue(null);
      await act(async () => root.render(<Fixture mode="create" />));
      const textarea = container.querySelector('textarea');
      expect(document.activeElement).not.toBe(textarea);

      jest.mocked(useCommentDraftPosition).mockReturnValue(0);
      await act(async () => root.render(<Fixture mode="create" />));
      expect(document.activeElement).toBe(textarea);
    });

    it('closes an empty draft when clicking outside', async () => {
      jest.useFakeTimers();
      await render('create', null);
      await act(async () => {
        document.body.dispatchEvent(
          new Event('pointerdown', { bubbles: true })
        );
      });
      expect(
        container
          .querySelector('.resource-comments-draft-surface')
          ?.hasAttribute('data-closing')
      ).toBe(true);
      expect(setPendingSelection).not.toHaveBeenCalled();
      await act(async () => jest.advanceTimersByTime(180));
      expect(setPendingSelection).toHaveBeenCalledWith(null);
    });

    it('keeps an empty draft open when clicking inside', async () => {
      await render('create', null);
      await act(async () => {
        container
          .querySelector('.resource-comments-draft-surface')
          ?.dispatchEvent(new Event('pointerdown', { bubbles: true }));
      });
      expect(setPendingSelection).not.toHaveBeenCalled();
    });

    it('keeps a text draft open when clicking outside', async () => {
      await render('create');
      await act(async () => {
        document.body.dispatchEvent(
          new Event('pointerdown', { bubbles: true })
        );
      });
      expect(setPendingSelection).not.toHaveBeenCalled();
    });

    it('keeps an image draft open while its upload is pending', async () => {
      upload.mockReturnValueOnce(deferredUpload().promise);
      await render('create', null);
      await attach();
      await act(async () => {
        document.body.dispatchEvent(
          new Event('pointerdown', { bubbles: true })
        );
      });
      expect(setPendingSelection).not.toHaveBeenCalled();
    });
  });

  it.each<Mode>(['create', 'edit', 'reply'])(
    'blocks clicks and Enter during %s upload, then sends the image',
    async mode => {
      const pending = deferredUpload();
      upload.mockReturnValueOnce(pending.promise);
      await render(mode);
      await attach();
      expect(submit().disabled).toBe(true);
      await act(async () => {
        submit().click();
        container
          .querySelector('textarea')
          ?.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
          );
      });
      expect(create).not.toHaveBeenCalled();
      expect(edit).not.toHaveBeenCalled();
      expect(reply).not.toHaveBeenCalled();
      await act(async () => pending.resolve(attachment));
      expect(submit().disabled).toBe(false);
      await act(async () => submit().click());
      if (mode === 'create') {
        expect(create).toHaveBeenCalledWith('Text', ['image']);
      }
      if (mode === 'edit') {
        expect(edit).toHaveBeenCalledWith('thread', 'comment', 'Text', [
          'image',
        ]);
      }
      if (mode === 'reply') {
        expect(reply).toHaveBeenCalledWith(['image']);
      }
    }
  );

  it.each<Mode>(['create', 'edit', 'reply'])(
    'ignores an earlier failure after replacing a %s image',
    async mode => {
      const first = deferredUpload();
      const second = deferredUpload();
      upload
        .mockReturnValueOnce(first.promise)
        .mockReturnValueOnce(second.promise);
      await render(mode);
      await attach();
      await act(async () =>
        container
          .querySelector<HTMLButtonElement>(
            '[aria-label="resource_comments.remove_image"]'
          )
          ?.click()
      );
      await attach();
      await act(async () => first.reject(new Error('Old upload failed')));
      expect(container.querySelector('img')?.getAttribute('src')).toBe(
        'blob:image-2'
      );
      expect(toast.error).not.toHaveBeenCalled();
      expect(submit().disabled).toBe(true);
      await act(async () => second.resolve(attachment));
      expect(submit().disabled).toBe(false);
    }
  );

  describe.each<Mode>(['create', 'edit', 'reply'])('%s image paste', mode => {
    it.each([false, true])(
      'uploads clipboard images and publishes their attachment (items: %s)',
      async useItems => {
        const pending = deferredUpload();
        const file = new File(['image'], 'pasted.png', { type: 'image/png' });
        upload.mockReturnValueOnce(pending.promise);
        await render(mode);
        const event = await paste([file], useItems);
        expect(event.defaultPrevented).toBe(true);
        expect(upload).toHaveBeenCalledWith(file);
        expect(container.querySelector('img')?.getAttribute('src')).toBe(
          'blob:image-1'
        );
        expect(submit().disabled).toBe(true);
        await act(async () => pending.resolve(attachment));
        await act(async () => submit().click());
        if (mode === 'create') {
          expect(create).toHaveBeenCalledWith('Text', ['image']);
        }
        if (mode === 'edit') {
          expect(edit).toHaveBeenCalledWith('thread', 'comment', 'Text', [
            'image',
          ]);
        }
        if (mode === 'reply') {
          expect(reply).toHaveBeenCalledWith(['image']);
        }
      }
    );

    it('preserves text paste and ignores non-image files', async () => {
      await render(mode);
      const event = await paste(
        [new File(['notes'], 'notes.txt', { type: 'text/plain' })],
        false,
        'Notes'
      );
      expect(event.defaultPrevented).toBe(false);
      expect(upload).not.toHaveBeenCalled();
    });

    it('leaves mixed text paste native while attaching its image', async () => {
      upload.mockResolvedValueOnce(attachment);
      await render(mode);
      const event = await paste(
        [new File(['image'], 'pasted.png', { type: 'image/png' })],
        false,
        'Caption'
      );
      expect(event.defaultPrevented).toBe(false);
      expect(upload).toHaveBeenCalledTimes(1);
      expect(container.querySelector('img')).not.toBeNull();
    });
  });

  it('waits for all edit images and releases every preview when canceled', async () => {
    const first = deferredUpload();
    const second = deferredUpload();
    upload
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    await render('edit');
    await attach();
    await attach();
    await act(async () => first.resolve(attachment));
    expect(submit().disabled).toBe(true);
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    await act(async () => {
      Array.from(container.querySelectorAll('button'))
        .find(button => button.textContent === 'resource_comments.cancel')
        ?.click();
    });
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:image-1');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:image-2');
    await act(async () => second.resolve({ ...attachment, id: 'second' }));
    expect(
      container.querySelector('.omnibox-comment-composer--edit')
    ).toBeNull();
  });

  it('retains a reply image when publication fails', async () => {
    upload.mockResolvedValueOnce(attachment);
    reply.mockRejectedValueOnce(new Error('Publication failed'));
    await render('reply');
    await attach();
    await act(async () => submit().click());
    expect(container.querySelector('img')).not.toBeNull();
    expect(submit().disabled).toBe(false);
  });
});
