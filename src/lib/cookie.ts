export function setCookie(
  name: string,
  value: string,
  path: string = '/',
  maxAge?: number
) {
  const maxAgeStr = maxAge ? `; max-age=${maxAge}` : '';
  document.cookie = `${name}=${value}; path=${path}; secure; samesite=strict${maxAgeStr}`;
}

export function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
}

export function removeCookie(name: string, path: string = '/') {
  document.cookie = `${name}=; path=${path}; secure; samesite=strict; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}
