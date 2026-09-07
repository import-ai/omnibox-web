import type { Citation } from '@/page/chat/core/types/chatResponse';

const rawCitePattern = /\[\[(\d+)]](?!\()/g;
const citePattern = /\[\[(\d+)]](?:\(([^)\s]+)\))?/g;
const safeUrlProtocol = /^(https?|ircs?|mailto|xmpp)$/i;
const citationIdPattern = /^C\d+(?:-|$)/;

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

/**
 * Replace citation tag
 * @param input
 * @param removeGeneratedCite
 * @param citesCount
 */
export function replaceCiteTag(
  input: string,
  removeGeneratedCite: boolean,
  citesCount: number
): string {
  return input.replace(rawCitePattern, (_, i) => {
    const id = Number(i) - 1;
    if ((id >= 0 && id < citesCount) || !removeGeneratedCite) {
      return `[[${i}]](#cite-${i})`;
    }
    return '';
  });
}

export function replaceReasoningCiteMarkers(input: string): string {
  return input.replace(citePattern, (_, i) => `[${i}]`);
}

export function copyPreprocess(content: string, citations: Citation[]): string {
  let citationsFooter: string = '';
  const origin = location.origin;
  const namespace = location.pathname.split('/')[1] || 'default';
  for (let i = 0; i < citations.length; i++) {
    const citation = citations[i];
    const title = citation.title.replace('"', '\\"');
    const link = citation.link.startsWith('http')
      ? citation.link
      : `${origin}/${namespace}/${citation.link}`;
    citationsFooter += `[${i + 1}]: ${link} "${title}"\n`;
  }

  if (citationsFooter) {
    content = content + '\n\n' + citationsFooter;
  }

  return content.replace(citePattern, (_, index, citationId) => {
    const citationIndex =
      findCitationById(citations, citationId)?.index ?? Number(index) - 1;
    if (citationIndex >= 0 && citationIndex < citations.length) {
      const footnoteIndex = citationIndex + 1;
      return `[^${footnoteIndex}][${footnoteIndex}]`;
    }
    return '';
  });
}

export function isCitationId(value: string | undefined): value is string {
  return Boolean(value && citationIdPattern.test(value));
}

export function getCitationLineNumber(citationId: string) {
  const match = citationId.match(/-L(\d+)(?:-\d+)?$/);
  if (!match) return undefined;

  const lineNumber = Number(match[1]);
  return Number.isSafeInteger(lineNumber) && lineNumber > 0
    ? lineNumber
    : undefined;
}

export function appendLineNumber(href: string, lineNumber?: number) {
  if (!lineNumber) return href;

  const [path] = href.split('#', 2);
  return `${path}#L${lineNumber}`;
}

function decodeCitationId(citationId: string): string {
  try {
    return decodeURIComponent(citationId);
  } catch {
    return citationId;
  }
}

export function findCitationById(
  citations: Citation[],
  citationId: string | undefined
): { citation: Citation; index: number } | undefined {
  if (!citationId) {
    return undefined;
  }
  const decodedCitationId = decodeCitationId(citationId);
  const index = citations.findIndex(
    citation => citation.id === decodedCitationId
  );
  if (index < 0) {
    return undefined;
  }
  return { citation: citations[index], index };
}

export function getResourceIdFromHash(href: string | undefined) {
  return href?.match(/^#([0-9A-Za-z]{16})$/)?.[1];
}

export function citationUrlTransform(url: string): string {
  if (isCitationId(url)) {
    return url;
  }

  const colon = url.indexOf(':');
  const questionMark = url.indexOf('?');
  const numberSign = url.indexOf('#');
  const slash = url.indexOf('/');

  if (
    colon === -1 ||
    (slash !== -1 && colon > slash) ||
    (questionMark !== -1 && colon > questionMark) ||
    (numberSign !== -1 && colon > numberSign) ||
    safeUrlProtocol.test(url.slice(0, colon))
  ) {
    return url;
  }

  return '';
}
