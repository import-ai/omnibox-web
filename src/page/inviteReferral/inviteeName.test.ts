import { formatInviteeName, isShortInviteeName } from './inviteeName';

describe('formatInviteeName', () => {
  it('keeps backend-masked names', () => {
    expect(formatInviteeName('Ai******94')).toBe('Ai******94');
  });

  it('keeps short names unmasked to match Figma', () => {
    expect(formatInviteeName('Ai')).toBe('Ai');
  });

  it('keeps the first and last two characters for longer names', () => {
    expect(formatInviteeName('AiUsername94')).toBe('Ai******94');
  });
});

describe('isShortInviteeName', () => {
  it('treats two-letter names as short', () => {
    expect(isShortInviteeName('Ai')).toBe(true);
  });

  it('does not treat prefix-suffix masks as short', () => {
    expect(isShortInviteeName('Ai******94')).toBe(false);
  });
});
