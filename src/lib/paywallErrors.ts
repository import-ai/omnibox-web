interface ErrorWithResponseCode {
  code?: unknown;
  response?: { data?: { code?: unknown } };
}

/** Error codes that mean the namespace cannot accept more content. */
const STORAGE_QUOTA_CODES = new Set(['storage_quota_exceeded']);

export function getResponseErrorCode(error: unknown): string {
  const candidate = error as ErrorWithResponseCode | undefined;
  const rawCode =
    candidate?.response?.data?.code ??
    (typeof candidate?.code === 'string' ? candidate.code : undefined);
  return typeof rawCode === 'string' ? rawCode.toLowerCase() : '';
}

/**
 * The backend reports both a full namespace and an expired subscription as
 * `STORAGE_QUOTA_EXCEEDED`, so callers must decide the copy from namespace
 * metadata rather than from the error alone.
 */
export function isStorageQuotaError(error: unknown): boolean {
  return STORAGE_QUOTA_CODES.has(getResponseErrorCode(error));
}
