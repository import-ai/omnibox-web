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
  const secure = location.protocol === 'https:' ? 'secure;' : '';
  document.cookie = `token=${token}; path=/; ${secure}samesite=strict; expires=${jwtExpiration.toUTCString()}`;
}

export function removeGlobalCredential() {
  localStorage.removeItem('uid');
  localStorage.removeItem('token');
  const secure = location.protocol === 'https:' ? 'secure;' : '';
  document.cookie = `token=; path=/; ${secure}samesite=strict; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  localStorage.removeItem('extension_login');
}
