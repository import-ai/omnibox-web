import { API_BASE_URL } from '@/const';
import { http } from '@/lib/request';

interface SessionResponse {
  uid: string;
}

export async function readSessionUser(
  signal: AbortSignal
): Promise<string | null> {
  // Verify the browser's HttpOnly cookie without injecting a stored bearer
  // token or triggering the standard HTTP client's login redirect.
  const response = await fetch(`${API_BASE_URL}/user/me`, {
    cache: 'no-store',
    credentials: 'same-origin',
    signal,
  });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error('Could not verify the current user');
  const { id } = (await response.json()) as { id?: unknown };
  if (typeof id !== 'string' && typeof id !== 'number') return null;
  return String(id);
}

/**
 * Exchanges the token this client holds for the httpOnly session cookie the
 * gateway reads. Entry points that receive a token outside a cookie must call
 * this before a full-page navigation, otherwise the gateway sees no session.
 *
 * Returns the user the session belongs to, which lets a client that lost its
 * local storage restore the signed-in state from the cookie alone.
 */
export async function establishServerSession(
  signal?: AbortSignal
): Promise<string> {
  const { uid } = (await http.post('auth/session', undefined, {
    mute: true,
    // Callers decide what to do when there is no session: public pages stay
    // put, private pages route to the login screen themselves.
    skipAuthRedirect: true,
    signal,
  })) as SessionResponse;
  return uid;
}
