import Cookies from 'js-cookie';

export function setGlobalCredential(userId: string, token: string) {
  localStorage.setItem('uid', userId);
  localStorage.setItem('token', token);
  let jwtExpiration: Date;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    jwtExpiration = new Date(payload.exp * 1000);
  } catch {
    jwtExpiration = new Date();
    jwtExpiration.setTime(jwtExpiration.getTime() + 24 * 60 * 60 * 1000);
  }
  const isSecure = location.protocol === 'https:';
  Cookies.set('token', token, {
    path: '/',
    secure: isSecure,
    sameSite: 'strict',
    expires: jwtExpiration,
  });
}

export function removeGlobalCredential() {
  localStorage.removeItem('uid');
  localStorage.removeItem('token');
  Cookies.remove('token', { path: '/' });
}
