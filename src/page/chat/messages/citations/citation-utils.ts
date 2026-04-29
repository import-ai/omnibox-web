import type { Citation } from '@/page/chat/core/types/chat-response';

const citePattern = / *\[\[(\d+)]]/g;
const safeUrlProtocol = /^(https?|ircs?|mailto|xmpp)$/i;

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
  return input.replace(citePattern, (_, i) => {
    const id = Number(i) - 1;
    if ((id >= 0 && id < citesCount) || !removeGeneratedCite) {
      return `[[${i}]](#cite-${i})`;
    }
    return '';
  });
}

export function isCiteRef(value: string | undefined): value is string {
  return Boolean(value && /^(vfs:\/|web:)/.test(value));
}

function decodeCiteRef(citeRef: string): string {
  try {
    return decodeURIComponent(citeRef);
  } catch {
    return citeRef;
  }
}

export function findCitationByCiteRef(
  citations: Citation[],
  citeRef: string | undefined
): { citation: Citation; index: number } | undefined {
  if (!isCiteRef(citeRef)) {
    return undefined;
  }
  const decodedCiteRef = decodeCiteRef(citeRef);
  const index = citations.findIndex(
    citation => citation.cite_ref === decodedCiteRef
  );
  if (index < 0) {
    return undefined;
  }
  return { citation: citations[index], index };
}

export function citationUrlTransform(url: string): string {
  if (isCiteRef(url)) {
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
