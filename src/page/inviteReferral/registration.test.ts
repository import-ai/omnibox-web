/** @jest-environment jsdom */

import { registerInviteReferral } from '@/service/inviteReferral';

import {
  consumeInviteReferralLanding,
  getStoredInviteRegistration,
  markInviteReferralLanding,
  markOrganicActivationLanding,
  registerInviteAfterLogin,
  retryPendingInviteRegistration,
  setStoredInviteRegistration,
} from './registration';
import {
  isRetryableInviteRegistrationError,
  isValidInviteCode,
  shouldRegisterInvite,
} from './registrationPolicy';

jest.mock('@/service/inviteReferral', () => ({
  registerInviteReferral: jest.fn(),
}));

const mockedRegisterInviteReferral = jest.mocked(registerInviteReferral);

describe('invite referral registration policy', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    mockedRegisterInviteReferral.mockReset();
  });

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

  it('marks a new user who registered without an invite code for activation', async () => {
    await expect(registerInviteAfterLogin(true, 'user-1')).resolves.toEqual({
      result: null,
      activation: true,
    });
    expect(mockedRegisterInviteReferral).not.toHaveBeenCalled();
  });

  it('routes the remembered landing to the activation page', () => {
    markOrganicActivationLanding();
    expect(consumeInviteReferralLanding()).toBe('activation');
    expect(consumeInviteReferralLanding()).toBeNull();

    markInviteReferralLanding(false);
    expect(consumeInviteReferralLanding()).toBe('invite');
  });

  it('clears an invite code when an existing user logs in', async () => {
    setStoredInviteRegistration({ code: '123456', source: 'link' });

    await expect(registerInviteAfterLogin(false, 'user-1')).resolves.toEqual({
      result: null,
      activation: false,
    });
    expect(getStoredInviteRegistration()).toEqual({
      code: '',
      source: 'manual',
    });
    expect(mockedRegisterInviteReferral).not.toHaveBeenCalled();
  });

  it('retries a pending registration for the same user and clears it', async () => {
    setStoredInviteRegistration({ code: '123456', source: 'link' });
    mockedRegisterInviteReferral.mockRejectedValueOnce({
      response: { status: 503 },
    });
    await registerInviteAfterLogin(true, 'user-1');
    expect(getStoredInviteRegistration().code).toBe('');

    mockedRegisterInviteReferral.mockResolvedValueOnce({
      is_invited_new_user: true,
      requires_phone_binding: true,
      task_expires_at: '2026-10-01T00:00:00Z',
    });
    await expect(retryPendingInviteRegistration('user-1')).resolves.toEqual(
      expect.objectContaining({ requires_phone_binding: true })
    );
    await expect(retryPendingInviteRegistration('user-1')).resolves.toBeNull();
    mockedRegisterInviteReferral.mockClear();
    await registerInviteAfterLogin(true, 'user-2');
    expect(mockedRegisterInviteReferral).not.toHaveBeenCalled();
  });

  it('does not mark activation when invite registration succeeds', async () => {
    setStoredInviteRegistration({ code: '123456', source: 'manual' });
    mockedRegisterInviteReferral.mockResolvedValueOnce({
      is_invited_new_user: true,
      requires_phone_binding: false,
      task_expires_at: '2026-10-01T00:00:00Z',
    });

    await expect(registerInviteAfterLogin(true, 'user-1')).resolves.toEqual({
      result: expect.objectContaining({ is_invited_new_user: true }),
    });
  });

  it('clears ordinary attribution after a terminal failure', async () => {
    setStoredInviteRegistration({ code: '123456', source: 'link' });
    mockedRegisterInviteReferral.mockRejectedValueOnce({
      response: { status: 400 },
    });
    await registerInviteAfterLogin(true, 'user-1');
    expect(getStoredInviteRegistration().code).toBe('');
    expect(await retryPendingInviteRegistration('user-1')).toBeNull();
  });
});
