/** @jest-environment jsdom */

import { renderToStaticMarkup } from 'react-dom/server.node';

import en from '@/i18n/locales/en.json';
import zh from '@/i18n/locales/zh.json';

import Contact from './index';

let mockLanguage: 'en' | 'zh' = 'zh';
const mockTranslations = { en, zh };

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      key
        .split('.')
        .reduce(
          (value: any, part) => value?.[part],
          mockTranslations[mockLanguage]
        ) ?? key,
  }),
}));
jest.mock('@/assets/icons/WechatGroupQrCode', () => ({
  WechatGroupQrCode: ({ alt }: { alt: string }) => (
    <img src="community-qr.png" alt={alt} />
  ),
}));
jest.mock('@/const', () => ({
  DISCORD_LINK: 'https://www.omnibox.pro/links/discord',
}));

it.each(['en', 'zh'] as const)(
  'renders all contact copy and accessible QR text in %s',
  language => {
    mockLanguage = language;
    const container = document.createElement('div');
    container.innerHTML = renderToStaticMarkup(<Contact />);
    const copy = mockTranslations[language].setting.contact;
    expect(container.querySelector('h3')?.textContent).toBe(copy.title);
    expect(container.querySelector('img')?.alt).toBe(copy.wechat_qr_alt);
    for (const text of [
      copy.description,
      copy.wechat_title,
      copy.wechat_description,
      copy.discord_title,
      copy.discord_description,
      copy.join_discord,
    ]) {
      expect(container.textContent).toContain(text);
    }
    const link = container.querySelector('a')!;
    expect(link.getAttribute('href')).toBe(
      'https://www.omnibox.pro/links/discord'
    );
    expect(link.target).toBe('_blank');
    expect(link.rel).toBe('noopener noreferrer');
    expect(link.querySelector('button')).toBeNull();
    expect(container.textContent).not.toContain('setting.contact.');
  }
);

it('keeps the new English and Chinese locale keys parallel and complete', () => {
  expect(Object.keys(en.setting.contact).sort()).toEqual(
    Object.keys(zh.setting.contact).sort()
  );
  for (const locale of [en, zh]) {
    expect(
      Object.values(locale.setting.contact).every(
        value => value.trim().length > 0
      )
    ).toBe(true);
    expect(locale.footer.contact).toBe(locale.setting.contact.title);
    expect(locale.footer.download_app).toBeTruthy();
  }
});
