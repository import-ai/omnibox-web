import { http } from '@/lib/request';

/**
 * Exchanges the token this client holds for the httpOnly session cookie the
 * gateway reads. Entry points that receive a token outside a cookie must call
 * this before a full-page navigation, otherwise the gateway sees no session.
 */
export async function establishServerSession(): Promise<void> {
  await http.post('auth/session', undefined, { mute: true });
}
