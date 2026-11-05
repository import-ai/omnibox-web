import { getAuthSuccessRedirect } from '@/page/user/authRedirect';
import { setGlobalCredential } from '@/page/user/util';

import { establishServerSession } from '../session';

/**
 * Completes the mini program hash hand-off. The token arrives in the URL, so
 * the browser needs the session cookie established before the page navigates
 * to the root path, where the gateway decides between the app and the site.
 */
export async function completeMiniProgramSignIn(
  uid: string,
  token: string,
  redirect: string | null
): Promise<string> {
  setGlobalCredential(uid, token);
  await establishServerSession();
  return getAuthSuccessRedirect(redirect);
}
