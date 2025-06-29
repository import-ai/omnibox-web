import { Citation } from '@/page/chat/types/chat-response.tsx';

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

export function extractDomain(text: string) {
  if (!text.startsWith('http')) {
    return '';
  }
  const loc = new URL(text);
  return loc.hostname;
}
