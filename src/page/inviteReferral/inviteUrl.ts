export function buildLocalizedInviteUrl(
  inviteUrl: string,
  locale: 'en' | 'zh-cn'
): string | null {
  try {
    const url = new URL(inviteUrl);
    url.pathname = `/${locale}/`;
    url.searchParams.delete('locale');
    return url.toString();
  } catch {
    return null;
  }
}
