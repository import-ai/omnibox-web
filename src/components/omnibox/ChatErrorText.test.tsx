/** @jest-environment jsdom */
import { createInstance } from 'i18next';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';

import en from '@/i18n/locales/en.json';
import zh from '@/i18n/locales/zh.json';
import { reportChatErrorDisplay } from '@/lib/chatErrorDisplay';

import ChatErrorText from './ChatErrorText';

jest.mock('@/lib/chatErrorDisplay', () => ({
  reportChatErrorDisplay: jest.fn(),
}));

const mockedReportChatErrorDisplay = jest.mocked(reportChatErrorDisplay);

beforeEach(() => {
  mockedReportChatErrorDisplay.mockClear();
});

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

it('updates a mounted historical error with the UI language and hides unknown details', async () => {
  const i18n = createInstance();
  await i18n.init({
    lng: 'zh',
    resources: { zh: { translation: zh }, en: { translation: en } },
  });
  const container = document.createElement('div');
  const root = createRoot(container);
  await act(async () =>
    root.render(
      <I18nextProvider i18n={i18n}>
        <ChatErrorText error="Software caused connection abort" />
      </I18nextProvider>
    )
  );
  expect(container.textContent).toBe(zh.chat.errors.connection_interrupted);
  await act(async () => {
    await i18n.changeLanguage('en');
  });
  expect(container.textContent).toBe(en.chat.errors.connection_interrupted);
  await act(async () =>
    root.render(
      <I18nextProvider i18n={i18n}>
        <ChatErrorText error="private provider detail" />
      </I18nextProvider>
    )
  );
  expect(container.textContent).toBe(en.chat.errors.unknown);
  expect(mockedReportChatErrorDisplay).not.toHaveBeenCalled();
  await act(async () => root.unmount());
});

it('reports the exact rendered red text with message and conversation context', async () => {
  const i18n = createInstance();
  await i18n.init({
    lng: 'zh',
    resources: { zh: { translation: zh }, en: { translation: en } },
  });
  const container = document.createElement('div');
  const root = createRoot(container);
  await act(async () =>
    root.render(
      <I18nextProvider i18n={i18n}>
        <ChatErrorText
          error={{ message: 'Software caused connection abort' }}
          conversationId="conversation-1"
          messageId="message-1"
          requestId="request-1"
          parentMessageId="parent-1"
          channel="web"
          clientState="failed_message"
        />
      </I18nextProvider>
    )
  );

  expect(mockedReportChatErrorDisplay).toHaveBeenCalledWith(
    zh.chat.errors.connection_interrupted,
    expect.objectContaining({
      conversationId: 'conversation-1',
      messageId: 'message-1',
      requestId: 'request-1',
      parentMessageId: 'parent-1',
      channel: 'web',
      clientState: 'failed_message',
      stage: 'display',
    }),
    expect.objectContaining({ message: 'Software caused connection abort' })
  );

  await act(async () => {
    await i18n.changeLanguage('en');
  });
  expect(mockedReportChatErrorDisplay).toHaveBeenLastCalledWith(
    en.chat.errors.connection_interrupted,
    expect.objectContaining({ messageId: 'message-1' }),
    expect.anything()
  );

  await act(async () => root.unmount());
});
