export function setGlobalCredential(userId: string, token: string) {
  localStorage.setItem('uid', userId);
  localStorage.setItem('token', token);
  document.cookie = `token=${token}; path=/; secure; samesite=strict`;
}

export function removeGlobalCredential() {
  localStorage.removeItem('uid');
  localStorage.removeItem('token');
  document.cookie =
    'token=; path=/; secure; samesite=strict; expires=Thu, 01 Jan 1970 00:00:00 GMT';
}
