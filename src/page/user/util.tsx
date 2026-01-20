import Cookies from 'js-cookie';

export type LastLoginMethod = 'email' | 'phone' | 'wechat' | 'google' | 'apple';

const LAST_LOGIN_METHOD_KEY = 'last_login_method';
const VALID_LAST_LOGIN_METHODS: LastLoginMethod[] = [
  'email',
  'phone',
  'wechat',
  'google',
  'apple',
];

export function setLastLoginMethod(method: LastLoginMethod): void {
  localStorage.setItem(LAST_LOGIN_METHOD_KEY, method);
}

export function getLastLoginMethod(): LastLoginMethod | null {
  const method = localStorage.getItem(LAST_LOGIN_METHOD_KEY);
  if (!method) {
    return null;
  }
  if (VALID_LAST_LOGIN_METHODS.includes(method as LastLoginMethod)) {
    return method as LastLoginMethod;
  }
  return null;
}

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
