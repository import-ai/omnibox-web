import {
  isRetryableInviteRegistrationError,
  isValidInviteCode,
  shouldRegisterInvite,
} from './registrationPolicy';

describe('invite referral registration policy', () => {
  it('accepts a 6-digit invite code', () => {
    expect(isValidInviteCode('123456')).toBe(true);
    expect(isValidInviteCode('12345')).toBe(false);
  });

  it('only registers invites for new users with a valid code', () => {
    expect(shouldRegisterInvite(true, '123456')).toBe(true);
    expect(shouldRegisterInvite(false, '123456')).toBe(false);
    expect(shouldRegisterInvite(true, '')).toBe(false);
  });

  it('retries server and network failures', () => {
    expect(
      isRetryableInviteRegistrationError({ response: { status: 503 } })
    ).toBe(true);
    expect(isRetryableInviteRegistrationError({ code: 'ERR_NETWORK' })).toBe(
      true
    );
    expect(
      isRetryableInviteRegistrationError({ response: { status: 400 } })
    ).toBe(false);
  });
});
