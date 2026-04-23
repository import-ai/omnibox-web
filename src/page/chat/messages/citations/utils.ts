import { safeParseURL } from '@/lib/utils';
import { Citation } from '@/page/chat/core/types/chat-response';

export function formatCitation(citation: Citation): {
  name: string;
  link: string;
} {
  const url = safeParseURL(citation.link);
  const name: string = url ? url.hostname : `@${citation.link}`;
  const link: string = url ? citation.link : `../${citation.link}`;
  return { name, link };
}

export function extractDomain(text: string) {
  const url = safeParseURL(text);
  return url ? url.hostname : '';
}
