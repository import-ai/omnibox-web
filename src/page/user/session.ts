import { http } from '@/lib/request';

interface SessionResponse {
  uid: string;
}

/**
 * Exchanges the token this client holds for the httpOnly session cookie the
 * gateway reads. Entry points that receive a token outside a cookie must call
 * this before a full-page navigation, otherwise the gateway sees no session.
 *
 * Returns the user the session belongs to, which lets a client that lost its
 * local storage restore the signed-in state from the cookie alone.
 */
export async function establishServerSession(): Promise<string> {
  const { uid } = (await http.post('auth/session', undefined, {
    mute: true,
  })) as SessionResponse;
  return uid;
}
