/** @jest-environment jsdom */

import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';

import * as en from '@/i18n/locales/en.json';
import * as zh from '@/i18n/locales/zh.json';

import { messageChannelLabel, MessageChannelTime } from './MessageChannelTime';

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const mockChannelLabels = {
  'chat.messages.user_context.channel.qq': '来自 QQ',
  'chat.messages.user_context.channel.wechat': '来自微信',
  'chat.messages.user_context.channel.wechat_clawbot': '来自微信 ClawBot',
  'chat.messages.user_context.channel.telegram': '来自 Telegram',
};

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      mockChannelLabels[key as keyof typeof mockChannelLabels] ?? key,
  }),
}));

describe('message channel copy', () => {
  it('uses the product labels in both locales', () => {
    expect(zh.chat.messages.user_context.channel).toEqual({
      qq: '来自 QQ',
      wechat: '来自微信',
      wechat_clawbot: '来自微信 ClawBot',
      telegram: '来自 Telegram',
    });
    expect(en.chat.messages.user_context.channel).toEqual({
      qq: 'from QQ',
      wechat: 'from WeChat',
      wechat_clawbot: 'from WeChat ClawBot',
      telegram: 'from Telegram',
    });
  });

  it('translates known channels and keeps unknown values', () => {
    const t = (key: string) =>
      mockChannelLabels[key as keyof typeof mockChannelLabels] ?? key;
    expect(messageChannelLabel('qq', t)).toBe('来自 QQ');
    expect(messageChannelLabel('wechat_clawbot', t)).toBe('来自微信 ClawBot');
    expect(messageChannelLabel('desk', t)).toBe('desk');
    expect(messageChannelLabel(undefined, t)).toBeNull();
  });
});

describe('MessageChannelTime', () => {
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

  async function render(side: 'user' | 'assistant') {
    await act(async () => {
      root.render(
        <MessageChannelTime
          channel="telegram"
          side={side}
          time="2026-10-14 10:00:00"
        />
      );
    });
    return Array.from(container.querySelectorAll('span span')).map(
      node => node.textContent
    );
  }

  it('places the user channel to the left of the date', async () => {
    await expect(render('user')).resolves.toEqual([
      '来自 Telegram',
      '2026-10-14 10:00:00',
    ]);
  });

  it('places the assistant channel to the right of the date', async () => {
    await expect(render('assistant')).resolves.toEqual([
      '2026-10-14 10:00:00',
      '来自 Telegram',
    ]);
  });
});
