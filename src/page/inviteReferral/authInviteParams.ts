import {
  getStoredInviteRegistration,
  setStoredInviteRegistration,
} from './registration';
import { isValidInviteCode } from './registrationPolicy';

type AuthQueryParams = Record<string, string | undefined | null>;

/** Restore link attribution without overwriting the source of an existing selection. */
export function restoreInviteFromUrl(search: string) {
  const code = new URLSearchParams(search).get('invite_code') || '';
  if (!isValidInviteCode(code)) return;
  if (getStoredInviteRegistration().code !== code) {
    setStoredInviteRegistration({ code, source: 'link' });
  }
}

/** Synchronize a confirmed selection while preserving unrelated auth parameters. */
export function updateInviteParams(params: URLSearchParams, code: string) {
  const next = new URLSearchParams(params);
  if (code) next.set('invite_code', code);
  else next.delete('invite_code');
  return next;
}

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
