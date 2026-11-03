export type CollectUrlIssue = 'invalid' | 'self';

export type CollectUrlResult = { url: string } | { error: CollectUrlIssue };

/** Same extraction and rejection rules as the React Native clipping save. */
export function prepareCollectUrl(value: string): CollectUrlResult {
  const trimmed = value.trim();
  const urlMatch = trimmed.match(/(https?:\/\/[^\s]+)/);
  const submitUrl = urlMatch ? urlMatch[1] : trimmed;

  if (!submitUrl || !/^https?:\/\//i.test(submitUrl)) {
    return { error: 'invalid' };
  }
  if (submitUrl.includes('omnibox.pro')) {
    return { error: 'self' };
  }
  return { url: submitUrl };
}
