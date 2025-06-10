import { Citation } from '@/page/chat/types/chat-response.tsx';

export function trimIncompletedCitation(text: string) {
  const citePrefix = '[[';
  const citePrefixRegexList = [/\[\[\d+$/g, /\[\[\d+]$/g];
  for (let i = citePrefix.length - 1; i >= 0; i--) {
    const suffix = citePrefix.slice(0, i + 1);
    if (text.endsWith(suffix)) {
      return text.slice(0, -suffix.length);
    }
  }
  for (const regex of citePrefixRegexList) {
    if (regex.test(text)) {
      return text.replace(regex, '');
    }
  }
  return text;
}

export function formatCitation(citation: Citation): {
  name: string;
  link: string;
} {
  const name: string = citation.link.startsWith('http')
    ? new URL(citation.link).hostname
    : `@${citation.link}`;
  const link: string = citation.link.startsWith('http')
    ? citation.link
    : `../${citation.link}`;
  return { name, link };
}
