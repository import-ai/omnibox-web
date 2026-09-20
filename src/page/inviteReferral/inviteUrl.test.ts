import { buildLocalizedInviteUrl } from './inviteUrl';

describe('buildLocalizedInviteUrl', () => {
  it('rewrites the invite landing path for Chinese', () => {
    expect(
      buildLocalizedInviteUrl(
        'https://www.omnibox.pro/?invite_code=123456',
        'zh-cn'
      )
    ).toBe('https://www.omnibox.pro/zh-cn/?invite_code=123456');
  });

  it('rewrites the invite landing path for English', () => {
    expect(
      buildLocalizedInviteUrl(
        'https://www.omnibox.pro/?invite_code=123456',
        'en'
      )
    ).toBe('https://www.omnibox.pro/en/?invite_code=123456');
  });

  it('returns null for invalid urls', () => {
    expect(buildLocalizedInviteUrl('not-a-url', 'zh-cn')).toBeNull();
  });
});
