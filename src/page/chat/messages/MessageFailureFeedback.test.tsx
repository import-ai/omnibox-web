/** @jest-environment jsdom */
import { createInstance } from 'i18next';
import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';

import { TooltipProvider } from '@/components/tooltip';
import en from '@/i18n/locales/en.json';
import zh from '@/i18n/locales/zh.json';
import type { MessageOperator } from '@/page/chat/core/messageOperator';
import {
  MessageStatus,
  OpenAIMessageRole,
} from '@/page/chat/core/types/chatResponse';
import type { MessageDetail } from '@/page/chat/core/types/conversation';

import { Messages } from './index';

jest.mock('@/lib/trackButtonClick', () => ({
  trackButtonClick: jest.fn(),
  onOverlayClose: () => jest.fn(),
}));
jest.mock('react-router-dom', () => ({ useParams: () => ({}) }));
jest.mock('@/page/share/ShareChatOnlyContext', () => ({
  useShareChatOnly: () => false,
}));
jest.mock('./role/AssistantMessage', () => ({
  AssistantMessage: () => null,
}));
jest.mock('./role/ToolMessage', () => ({ ToolMessage: () => null }));
jest.mock('@/components/ImagePreviewDialog', () => ({
  ImagePreviewDialog: () => null,
}));
jest.mock('@/service/resource', () => ({
  fetchResourcesByIds: jest.fn().mockResolvedValue([]),
}));
jest.mock('@/service/share', () => ({ fetchShareResource: jest.fn() }));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('message failure feedback', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it.each([
    ['zh', 'Failed to upload image', 'UPLOAD_FAILED', 'upload_failed', false],
    ['en', 'Failed to upload image', 'UPLOAD_FAILED', 'upload_failed', false],
    [
      'zh',
      'Failed to fetch',
      'STREAM_CONNECTION_FAILED',
      'connection_interrupted',
      false,
    ],
    [
      'en',
      'Failed to fetch',
      'STREAM_CONNECTION_FAILED',
      'connection_interrupted',
      false,
    ],
    [
      'zh',
      'Failed to fetch',
      'STREAM_CONNECTION_FAILED',
      'connection_interrupted',
      true,
    ],
    [
      'en',
      'Failed to fetch',
      'STREAM_CONNECTION_FAILED',
      'connection_interrupted',
      true,
    ],
  ] as const)(
    'shows one %s error and one working retry for %s (%s / %s, decision: %s)',
    async (language, errorMessage, errorCode, errorName, isDecision) => {
      const i18n = createInstance();
      await i18n.init({
        lng: language,
        resources: { zh: { translation: zh }, en: { translation: en } },
      });
      const message: MessageDetail = {
        id: 'pending',
        clientKey: 1,
        parent_id: '',
        children: [],
        status: MessageStatus.FAILED,
        message: { role: OpenAIMessageRole.USER, content: 'hello' },
        attrs: {
          pending_query: !isDecision,
          error_message: errorMessage,
          error_code: errorCode,
          ...(isDecision
            ? {
                tool_call: {
                  status: 'completed',
                  decisions: [{ type: 'approve' as const }],
                },
              }
            : {}),
        },
      };
      const onEdit = jest.fn();
      await act(async () => {
        root.render(
          <I18nextProvider i18n={i18n}>
            <TooltipProvider>
              <Messages
                conversation={{ id: 'c', mapping: { pending: message } }}
                messages={[message]}
                messageOperator={
                  {
                    getParent: () => undefined,
                    getSiblings: () => ['pending'],
                  } as unknown as MessageOperator
                }
                onEdit={onEdit}
                onRegenerate={jest.fn()}
              />
            </TooltipProvider>
          </I18nextProvider>
        );
      });

      const copy = language === 'zh' ? zh : en;
      expect(container.querySelectorAll('[role="alert"]')).toHaveLength(1);
      expect(
        container.textContent?.split(copy.chat.errors[errorName])
      ).toHaveLength(2);
      expect(container.textContent).toContain(copy.chat.errors[errorName]);
      expect(container.textContent).not.toContain(
        copy.chat.delivery.send_failed
      );
      expect(container.textContent).not.toContain(errorMessage);
      const buttons = container.querySelectorAll('button');
      expect(buttons).toHaveLength(1);
      expect(buttons[0].textContent).toBe(copy.chat.delivery.retry_send);
      await act(async () => buttons[0].click());
      expect(onEdit).toHaveBeenCalledTimes(1);
      expect(onEdit).toHaveBeenCalledWith('pending', 'hello');
    }
  );
});
