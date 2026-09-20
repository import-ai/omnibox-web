import type {
  InviteRegistrationResult,
  InviteSource,
} from '@/service/inviteReferral';
import { registerInviteReferral } from '@/service/inviteReferral';

import {
  isRetryableInviteRegistrationError,
  shouldRegisterInvite,
} from './registrationPolicy';

export {
  isRetryableInviteRegistrationError,
  isValidInviteCode,
  shouldRegisterInvite,
} from './registrationPolicy';

const INVITE_CODE_KEY = 'omnibox.inviteReferral.code';
const INVITE_SOURCE_KEY = 'omnibox.inviteReferral.source';
const INVITE_LANDING_KEY = 'omnibox.inviteReferral.landing';
const INVITE_PHONE_BINDING_KEY = 'omnibox.inviteReferral.phoneBinding';
const PENDING_REGISTRATION_KEY = 'omnibox.inviteReferral.pendingRegistration';
const ATTRIBUTION_WINDOW_MS = 15 * 60 * 1000;

export interface InviteRegistrationContext {
  code: string;
  source: InviteSource;
}

interface PendingInviteRegistration extends InviteRegistrationContext {
  expiresAt: number;
  userId: string;
}

export function getStoredInviteRegistration(): InviteRegistrationContext {
  return {
    code: sessionStorage.getItem(INVITE_CODE_KEY) || '',
    source:
      (sessionStorage.getItem(INVITE_SOURCE_KEY) as InviteSource | null) ||
      'manual',
  };
}

export function setStoredInviteRegistration(value: InviteRegistrationContext) {
  if (value.code) {
    sessionStorage.setItem(INVITE_CODE_KEY, value.code);
    sessionStorage.setItem(INVITE_SOURCE_KEY, value.source);
    return;
  }
  sessionStorage.removeItem(INVITE_CODE_KEY);
  sessionStorage.removeItem(INVITE_SOURCE_KEY);
}

export function markInviteReferralLanding(requiresPhoneBinding: boolean) {
  sessionStorage.setItem(INVITE_LANDING_KEY, '1');
  if (requiresPhoneBinding) {
    sessionStorage.setItem(INVITE_PHONE_BINDING_KEY, '1');
  } else {
    sessionStorage.removeItem(INVITE_PHONE_BINDING_KEY);
  }
}

export function consumeInviteReferralLanding() {
  const pending = sessionStorage.getItem(INVITE_LANDING_KEY) === '1';
  sessionStorage.removeItem(INVITE_LANDING_KEY);
  return pending;
}

export function hasInvitePhoneBinding() {
  return sessionStorage.getItem(INVITE_PHONE_BINDING_KEY) === '1';
}

export function clearInvitePhoneBinding() {
  sessionStorage.removeItem(INVITE_PHONE_BINDING_KEY);
}

function readPendingRegistration(): PendingInviteRegistration | null {
  const value = sessionStorage.getItem(PENDING_REGISTRATION_KEY);
  if (!value) return null;
  try {
    return JSON.parse(value) as PendingInviteRegistration;
  } catch {
    sessionStorage.removeItem(PENDING_REGISTRATION_KEY);
    return null;
  }
}

async function submitPendingRegistration(
  pending: PendingInviteRegistration,
  userId: string
) {
  if (pending.userId !== userId || pending.expiresAt <= Date.now()) {
    if (pending.userId === userId) {
      sessionStorage.removeItem(PENDING_REGISTRATION_KEY);
    }
    return null;
  }
  const result = await registerInviteReferral(pending.code, pending.source);
  sessionStorage.removeItem(PENDING_REGISTRATION_KEY);
  return result;
}

export async function retryPendingInviteRegistration(userId: string) {
  const pending = readPendingRegistration();
  if (!pending) return null;
  try {
    return await submitPendingRegistration(pending, userId);
  } catch (error) {
    if (!isRetryableInviteRegistrationError(error)) {
      sessionStorage.removeItem(PENDING_REGISTRATION_KEY);
    }
    return null;
  }
}

export async function registerInviteAfterLogin(
  isNewUser: boolean,
  userId: string
): Promise<{
  error?: unknown;
  result: InviteRegistrationResult | null;
}> {
  const { code, source } = getStoredInviteRegistration();
  if (!shouldRegisterInvite(isNewUser, code)) return { result: null };
  try {
    const result = await registerInviteReferral(code, source);
    sessionStorage.removeItem(INVITE_CODE_KEY);
    sessionStorage.removeItem(INVITE_SOURCE_KEY);
    return { result };
  } catch (error) {
    if (isRetryableInviteRegistrationError(error) && userId) {
      sessionStorage.setItem(
        PENDING_REGISTRATION_KEY,
        JSON.stringify({
          code,
          expiresAt: Date.now() + ATTRIBUTION_WINDOW_MS,
          source,
          userId,
        } satisfies PendingInviteRegistration)
      );
    }
    return { error, result: null };
  }
}
