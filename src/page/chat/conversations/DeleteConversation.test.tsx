/** @jest-environment jsdom */

import { createInstance } from 'i18next';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { toast } from 'sonner';

import ConfirmDeleteDialog from '@/components/confirm-delete-dialog';
import { TooltipProvider } from '@/components/tooltip';
import en from '@/i18n/locales/en.json';
import zh from '@/i18n/locales/zh.json';
import { http } from '@/lib/request';
import Actions from '@/page/chat/header/Actions';
import { useCopilotStore } from '@/page/copilot/copilotStore';

import RemoveHistory from './RemoveHistory';

const navigate = jest.fn();
const onFinish = jest.fn();
const onOpenChange = jest.fn();
const mockFire = jest.fn();

jest.mock('react', () => {
  const react = jest.requireActual<typeof import('react')>('react');
  return { ...react, default: react };
});
jest.mock('react-router-dom', () => ({ useNavigate: () => navigate }));
jest.mock('@/hooks/useApp', () => ({
  __esModule: true,
  default: () => ({ fire: mockFire }),
}));
jest.mock('@/lib/chatBridge', () => ({
  resetChatForNamespaceSwitch: jest.fn(),
}));
jest.mock('@/page/copilot/ExpandCopilotButton', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/lib/request', () => ({
  http: { delete: jest.fn(), get: jest.fn(), post: jest.fn() },
}));
jest.mock('sonner', () => ({
  toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() }),
}));

Object.assign(globalThis, {
  IS_REACT_ACT_ENVIRONMENT: true,
  ResizeObserver: jest.fn(() => ({
    observe: jest.fn(),
    disconnect: jest.fn(),
    unobserve: jest.fn(),
  })),
});

describe('confirmed conversation deletion', () => {
  let container: HTMLDivElement;
  let root: Root;
  let userSequence = 0;
  const i18n = createInstance();

  beforeAll(async () => {
    await i18n.init({
      lng: 'en',
      fallbackLng: 'en',
      resources: { en: { translation: en }, zh: { translation: zh } },
      interpolation: { escapeValue: false },
      showSupportNotice: false,
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    userSequence += 1;
    localStorage.setItem('uid', `user-${userSequence}`);
    useCopilotStore.getState().reset('space');
    jest.mocked(http.delete).mockResolvedValue({});
    jest.mocked(http.get).mockResolvedValue({
      total: 3,
      data: [
        { id: 'conversation', title: 'Test conversation' },
        { id: 'next-conversation', title: 'Next conversation' },
        { id: 'previous-conversation', title: 'Previous conversation' },
      ],
    });
    jest.mocked(http.post).mockResolvedValue({ id: 'conversation' });
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  async function open(
    entry: 'header' | 'history',
    language = 'en',
    conversationId = 'conversation',
    title = 'Test conversation'
  ) {
    await act(async () => {
      await i18n.changeLanguage(language);
      root.render(
        <I18nextProvider i18n={i18n}>
          <TooltipProvider>
            {entry === 'header' ? (
              <Actions
                homePage={false}
                conversationsPage={false}
                chatTitle={title}
                namespaceId="space"
                conversationId={conversationId}
              />
            ) : (
              <RemoveHistory
                data={{
                  id: conversationId,
                  title,
                  open: true,
                }}
                namespaceId="space"
                onFinish={onFinish}
                onOpenChange={onOpenChange}
              />
            )}
          </TooltipProvider>
        </I18nextProvider>
      );
    });

    if (entry === 'header') {
      const trigger = container.querySelector<HTMLElement>(
        '[aria-haspopup="menu"]'
      )!;
      await act(async () => {
        trigger.focus();
        trigger.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
        );
      });
      const remove = Array.from(
        document.querySelectorAll<HTMLElement>('[role="menuitem"]')
      ).find(
        item => item.textContent === i18n.t('chat.conversations.delete.option')
      )!;
      await act(async () => remove.click());
    }
    expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();
  }

  async function click(label: 'delete' | 'cancel') {
    const button = Array.from(
      document.querySelectorAll<HTMLButtonElement>(
        '[role="alertdialog"] button'
      )
    ).find(item => item.textContent === i18n.t(label))!;
    await act(async () => button.click());
  }

  function expectNoSuccess() {
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(onFinish).not.toHaveBeenCalled();
    expect(http.post).not.toHaveBeenCalled();
  }

  it.each([
    ['header', 'en'],
    ['header', 'zh'],
    ['history', 'en'],
    ['history', 'zh'],
  ] as const)(
    'shows success without undo from %s in %s',
    async (entry, language) => {
      await open(entry, language);
      await click('delete');

      expect(http.delete).toHaveBeenCalledTimes(1);
      expect(http.delete).toHaveBeenCalledWith(
        `${entry === 'header' ? '/' : ''}namespaces/space/conversations/conversation`
      );
      expect(toast).not.toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledTimes(1);
      expect(toast.success).toHaveBeenCalledWith(
        i18n.t('chat.conversations.deleted'),
        {
          description: i18n.t('chat.conversations.deleted_description'),
          position: 'bottom-right',
        }
      );
      expect(http.post).not.toHaveBeenCalled();
      if (entry === 'header') {
        expect(mockFire).toHaveBeenCalledWith('chat:conversation:deleted', {
          namespaceId: 'space',
          conversationId: 'conversation',
        });
        expect(navigate).toHaveBeenCalledWith('/space/chat/next-conversation', {
          flushSync: true,
        });
      } else {
        expect(onFinish).toHaveBeenCalledTimes(1);
      }
    }
  );

  it.each([
    [
      'falls back to the previous conversation at the end of the list',
      [
        { id: 'previous-conversation', title: 'Previous conversation' },
        { id: 'conversation', title: 'Test conversation' },
      ],
      '/space/chat/previous-conversation',
    ],
    [
      'opens chat home when the deleted conversation is the only one',
      [{ id: 'conversation', title: 'Test conversation' }],
      '/space/chat',
    ],
  ] as const)('%s', async (_case, conversations, expectedPath) => {
    jest.mocked(http.get).mockResolvedValueOnce({
      total: conversations.length,
      data: conversations,
    });

    await open('header');
    await click('delete');

    expect(navigate).toHaveBeenCalledWith(expectedPath, {
      flushSync: true,
    });
  });

  it('keeps only the latest overlapping delete navigation', async () => {
    let resolveFirstOrder!: (value: object) => void;
    let resolveSecondOrder!: (value: object) => void;
    jest
      .mocked(http.get)
      .mockReturnValueOnce(
        new Promise(resolve => {
          resolveFirstOrder = resolve;
        })
      )
      .mockReturnValueOnce(
        new Promise(resolve => {
          resolveSecondOrder = resolve;
        })
      );

    await open('header');
    await click('delete');
    await open('header', 'en', 'next-conversation', 'Next conversation');
    await click('delete');

    expect(http.delete).toHaveBeenNthCalledWith(
      1,
      '/namespaces/space/conversations/conversation'
    );
    expect(http.delete).toHaveBeenNthCalledWith(
      2,
      '/namespaces/space/conversations/next-conversation'
    );

    const conversations = {
      total: 3,
      data: [
        { id: 'conversation', title: 'Test conversation' },
        { id: 'next-conversation', title: 'Next conversation' },
        { id: 'previous-conversation', title: 'Previous conversation' },
      ],
    };
    await act(async () => resolveSecondOrder(conversations));
    await act(async () => resolveFirstOrder(conversations));

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('/space/chat/previous-conversation', {
      flushSync: true,
    });
    expect(mockFire).toHaveBeenCalledWith('chat:conversation:deleted', {
      namespaceId: 'space',
      conversationId: 'conversation',
    });
    expect(mockFire).toHaveBeenCalledWith('chat:conversation:deleted', {
      namespaceId: 'space',
      conversationId: 'next-conversation',
    });
  });

  it('freezes the delete target while the confirmation dialog is open', async () => {
    await open('header');

    await act(async () => {
      root.render(
        <I18nextProvider i18n={i18n}>
          <TooltipProvider>
            <Actions
              homePage={false}
              conversationsPage={false}
              chatTitle="Next conversation"
              namespaceId="space"
              conversationId="next-conversation"
            />
          </TooltipProvider>
        </I18nextProvider>
      );
    });

    expect(
      document.querySelector('[role="alertdialog"]')?.textContent
    ).toContain('Test conversation');
    await click('delete');

    expect(http.delete).toHaveBeenCalledWith(
      '/namespaces/space/conversations/conversation'
    );
    expect(navigate).not.toHaveBeenCalled();
    expect(mockFire).toHaveBeenCalledWith('chat:conversation:deleted', {
      namespaceId: 'space',
      conversationId: 'conversation',
    });
  });

  it('does not navigate when the user leaves before adjacent resolution', async () => {
    let resolveConversationOrder!: (value: object) => void;
    jest.mocked(http.get).mockReturnValueOnce(
      new Promise(resolve => {
        resolveConversationOrder = resolve;
      })
    );
    await open('header');
    await click('delete');

    expect(mockFire).toHaveBeenCalledWith('chat:conversation:deleted', {
      namespaceId: 'space',
      conversationId: 'conversation',
    });
    await act(async () => {
      root.render(
        <I18nextProvider i18n={i18n}>
          <TooltipProvider>
            <Actions
              homePage={false}
              conversationsPage={false}
              chatTitle="Next conversation"
              namespaceId="space"
              conversationId="next-conversation"
            />
          </TooltipProvider>
        </I18nextProvider>
      );
    });

    await act(async () => {
      resolveConversationOrder({
        total: 3,
        data: [
          { id: 'conversation', title: 'Test conversation' },
          { id: 'next-conversation', title: 'Next conversation' },
          { id: 'previous-conversation', title: 'Previous conversation' },
        ],
      });
    });

    expect(navigate).not.toHaveBeenCalled();
  });

  it('leaves the deleted conversation when the user returns before navigation resolves', async () => {
    let resolveConversationOrder!: (value: object) => void;
    jest.mocked(http.get).mockReturnValueOnce(
      new Promise(resolve => {
        resolveConversationOrder = resolve;
      })
    );
    await open('header');
    await click('delete');

    const renderConversation = async (
      conversationId: string,
      title: string
    ) => {
      await act(async () => {
        root.render(
          <I18nextProvider i18n={i18n}>
            <TooltipProvider>
              <Actions
                homePage={false}
                conversationsPage={false}
                chatTitle={title}
                namespaceId="space"
                conversationId={conversationId}
              />
            </TooltipProvider>
          </I18nextProvider>
        );
      });
    };
    await renderConversation('next-conversation', 'Next conversation');
    await renderConversation('conversation', 'Test conversation');
    await act(async () => {
      resolveConversationOrder({
        total: 3,
        data: [
          { id: 'conversation', title: 'Test conversation' },
          { id: 'next-conversation', title: 'Next conversation' },
          { id: 'previous-conversation', title: 'Previous conversation' },
        ],
      });
    });

    expect(navigate).toHaveBeenCalledWith('/space/chat/next-conversation', {
      flushSync: true,
    });
  });

  describe.each(['header', 'history'] as const)('%s entry', entry => {
    it('cancels without deleting or reporting success', async () => {
      await open(entry);
      await click('cancel');
      expect(http.delete).not.toHaveBeenCalled();
      if (entry === 'header') {
        expect(document.querySelector('[role="alertdialog"]')).toBeNull();
      } else {
        expect(onOpenChange).toHaveBeenCalledWith(false);
      }
      expectNoSuccess();
    });

    it('does not report success when deletion fails', async () => {
      jest
        .mocked(http.delete)
        .mockRejectedValueOnce(new Error('Deletion failed'));
      await open(entry);
      await click('delete');
      expect(http.delete).toHaveBeenCalledTimes(1);
      expectNoSuccess();
    });

    it('waits for the deletion response before reporting success', async () => {
      let resolveDelete!: (value: object) => void;
      jest.mocked(http.delete).mockReturnValueOnce(
        new Promise(resolve => {
          resolveDelete = resolve;
        })
      );
      await open(entry);
      await click('delete');
      expectNoSuccess();
      await act(async () => resolveDelete({}));
      expect(toast.success).toHaveBeenCalledTimes(1);
    });
  });

  it('preserves explicit undo for other reusable dialog consumers', async () => {
    const onRestoreSuccess = jest.fn();
    await act(async () =>
      root.render(
        <I18nextProvider i18n={i18n}>
          <ConfirmDeleteDialog
            open
            itemTitle="Restorable item"
            deleteUrl="/items/item"
            restoreUrl="/items/item/restore"
            successMessage="Deleted"
            onOpenChange={onOpenChange}
            onSuccess={onFinish}
            onRestoreSuccess={onRestoreSuccess}
          />
        </I18nextProvider>
      )
    );
    await click('delete');
    expect(toast.success).not.toHaveBeenCalled();
    expect(onFinish).toHaveBeenCalledTimes(1);
    const options = jest.mocked(toast).mock.calls[0][1]!;
    const action = options.action as { label: string; onClick: () => void };
    expect(action.label).toBe(i18n.t('undo'));
    await act(async () => action.onClick());
    expect(http.post).toHaveBeenCalledWith('/items/item/restore');
    expect(onRestoreSuccess).toHaveBeenCalledWith({ id: 'conversation' });
    expect(onFinish).toHaveBeenCalledTimes(1);
  });
});
