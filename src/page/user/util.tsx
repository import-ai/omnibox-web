export function setGlobalCredential(userId: string, token: string) {
  localStorage.setItem('uid', userId);
  localStorage.setItem('token', token);
  document.cookie = `token=${token}; path=/; secure; samesite=strict`;
}
