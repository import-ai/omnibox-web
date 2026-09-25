import { getAuthSuccessRedirect } from '@/page/user/authRedirect';
import { setGlobalCredential } from '@/page/user/util';

import {
  markInviteReferralLanding,
  registerInviteAfterLogin,
} from './registration';

export async function completeAuthRedirect(
  response: {
    id: string;
    access_token: string;
    is_new_user?: boolean;
  },
  redirect?: string | null
) {
  setGlobalCredential(response.id, response.access_token);
  const invite = await registerInviteAfterLogin(
    response.is_new_user === true,
    response.id
  );
  if (invite.result) {
    markInviteReferralLanding(invite.result.requires_phone_binding);
    const target = await getAuthSuccessRedirect(redirect ?? null);
    location.href = target.startsWith('/user/desktop-auth?') ? target : '/';
    return;
  }
  location.href = await getAuthSuccessRedirect(redirect ?? null);
}
