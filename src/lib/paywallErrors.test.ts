import { isStorageQuotaError } from './paywallErrors';

describe('isStorageQuotaError', () => {
  it('recognizes the backend storage quota code on an axios error', () => {
    expect(
      isStorageQuotaError({
        response: { data: { code: 'STORAGE_QUOTA_EXCEEDED' } },
      })
    ).toBe(true);
  });

  it('recognizes the code preserved by uploadFiles', () => {
    const error = new Error('storage quota exceeded') as Error & {
      code?: string;
    };
    error.code = 'STORAGE_QUOTA_EXCEEDED';
    expect(isStorageQuotaError(error)).toBe(true);
  });

  it('ignores unrelated errors', () => {
    expect(isStorageQuotaError(new Error('network failed'))).toBe(false);
    expect(
      isStorageQuotaError({ response: { data: { code: 'INVALID_TOKEN' } } })
    ).toBe(false);
  });
});
