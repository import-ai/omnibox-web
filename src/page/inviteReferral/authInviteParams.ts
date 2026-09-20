import { getStoredInviteRegistration } from './registration';
import { isValidInviteCode } from './registrationPolicy';

type AuthQueryParams = Record<string, string | undefined | null>;

export function getInviteCodeForAuthUrl(
  search = typeof window === 'undefined' ? '' : window.location.search
) {
  const fromUrl = new URLSearchParams(search).get('invite_code') || '';
  if (isValidInviteCode(fromUrl)) return fromUrl;
  const fromStore = getStoredInviteRegistration().code;
  return isValidInviteCode(fromStore) ? fromStore : '';
}

export function withInviteCode(
  params: AuthQueryParams,
  search = typeof window === 'undefined' ? '' : window.location.search
): AuthQueryParams {
  const invite_code = getInviteCodeForAuthUrl(search);
  return invite_code ? { ...params, invite_code } : params;
}
