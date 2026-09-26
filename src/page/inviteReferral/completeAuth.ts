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
  const target = await getAuthSuccessRedirect(redirect ?? null);
  if (invite.result) {
    markInviteReferralLanding(invite.result.requires_phone_binding);
    location.href = target.startsWith('/oauth/authorize?') ? target : '/';
    return;
  }
  location.href = target;
}
