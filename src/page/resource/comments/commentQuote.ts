const IMAGE_COMMENT_QUOTE_PREFIX = 'omnibox-image:';
/** Human-readable value stored for other clients that do not know image comments. */
export const IMAGE_COMMENT_STORED_QUOTE = '[图片]';

const READABLE_IMAGE_QUOTES = new Set(['[图片]', '[Image]']);

interface ImageCommentQuote {
  alt: string;
  src: string;
}

export function parseImageCommentQuote(
  quote: string
): ImageCommentQuote | null {
  if (!quote.startsWith(IMAGE_COMMENT_QUOTE_PREFIX)) {
    return null;
  }
  try {
    const value = JSON.parse(
      quote.slice(IMAGE_COMMENT_QUOTE_PREFIX.length)
    ) as Partial<ImageCommentQuote> | null;
    if (!value || typeof value !== 'object') {
      return null;
    }
    return {
      alt: typeof value.alt === 'string' ? value.alt : '',
      src: typeof value.src === 'string' ? value.src : '',
    };
  } catch {
    return null;
  }
}

export function createImageCommentQuote(attrs: {
  alt?: string | null;
  src?: string | null;
}): string {
  const quote: ImageCommentQuote = {
    alt: attrs.alt?.trim().slice(0, 500) ?? '',
    src: attrs.src?.trim().slice(0, 4000) ?? '',
  };
  return `${IMAGE_COMMENT_QUOTE_PREFIX}${JSON.stringify(quote)}`;
}

export function isImageCommentQuote(quote: string) {
  return (
    READABLE_IMAGE_QUOTES.has(quote.trim()) ||
    parseImageCommentQuote(quote) !== null
  );
}

export function commentQuoteForStorage(quote: string, isImage: boolean) {
  if (isImage || isImageCommentQuote(quote)) {
    return IMAGE_COMMENT_STORED_QUOTE;
  }
  return quote;
}

export function formatResourceCommentQuote(quote: string, imageLabel: string) {
  if (isImageCommentQuote(quote)) {
    return imageLabel;
  }
  return quote;
}

export function imageCommentLabel(
  threadId: string | null,
  quote: string,
  imageLabel: string
) {
  if (isImageCommentQuote(quote) || commentMarkerContainsImage(threadId)) {
    return imageLabel;
  }
  return quote;
}

function escapeCssAttribute(value: string) {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }
  return value.replace(/["\\]/g, '\\$&');
}

function commentMarkerContainsImage(threadId: string | null) {
  if (!threadId || typeof document === 'undefined') {
    return false;
  }
  const escaped = escapeCssAttribute(threadId);
  const marker = document.querySelector(
    `[data-resource-comment-thread="${escaped}"], [data-resource-comment-threads~="${escaped}"]`
  );
  return Boolean(marker?.querySelector('img'));
}
