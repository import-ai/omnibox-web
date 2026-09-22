const STAR_MASK = '******';

export function formatInviteeName(name: string) {
  const value = name.trim();
  if (!value || value.includes('*') || value.length <= 2) return value;
  if (value.length <= 4) {
    return `${value.slice(0, 1)}${STAR_MASK}${value.slice(-1)}`;
  }
  return `${value.slice(0, 2)}${STAR_MASK}${value.slice(-2)}`;
}

export function isShortInviteeName(name: string) {
  return name.replace(/\*+/g, '').length <= 2;
}
