import {
  buildSearchPreview,
  buildSearchRequestPayload,
  createSearchRequestId,
  isSearchJudgmentFailedError,
  isSearchPendingError,
  retrySearchPending,
  toSearchPreviewText,
} from './searchUtils';

describe('search preview', () => {
  it('treats markdown as-is for preview text', () => {
    const md = '## 标题\n\n**bold** 连接办公室网络 连接信息如下';
    const preview = buildSearchPreview(md);
    expect(preview).toContain('标题');
    expect(preview).toContain('连接办公室网络');
    expect(preview).toContain('连接信息如下');
    expect(preview).not.toContain('"type":"doc"');
    expect(preview).not.toContain('"attrs"');
  });

  it('keeps legacy markdown as-is (online-compatible)', () => {
    const md =
      '## 自动续费说明\n\n**一、自动续费服务** 您可选择通过授权 Apple 支付';
    const text = toSearchPreviewText(md);
    expect(text).toBe(md);
  });

  it('truncates long previews', () => {
    const long = '字'.repeat(200);
    const preview = buildSearchPreview(long);
    expect(preview.endsWith('...')).toBe(true);
    expect(preview.length).toBeLessThanOrEqual(123);
  });

  it('returns empty string for empty content', () => {
    expect(buildSearchPreview('')).toBe('');
    expect(buildSearchPreview(undefined)).toBe('');
  });
});

describe('search pending retry', () => {
  const wireError = (code: string) =>
    Object.assign(new Error(code), { response: { data: { code } } });

  it('recognizes the pending business code case-insensitively', () => {
    expect(isSearchPendingError(wireError('SEARCH_PENDING'))).toBe(true);
    expect(isSearchPendingError(wireError('search_pending'))).toBe(true);
    expect(isSearchPendingError(wireError('search_capacity'))).toBe(false);
    expect(isSearchPendingError(new Error('network'))).toBe(false);
    expect(isSearchPendingError(null)).toBe(false);
  });

  it('retries a pending page until the server returns one', async () => {
    const request = jest
      .fn()
      .mockRejectedValueOnce(wireError('search_pending'))
      .mockRejectedValueOnce(wireError('search_pending'))
      .mockResolvedValue({ items: [{ id: 'a' }] });

    await expect(retrySearchPending(request, { delayMs: 0 })).resolves.toEqual({
      items: [{ id: 'a' }],
    });
    expect(request).toHaveBeenCalledTimes(3);
  });

  it('stops after the bounded attempt count', async () => {
    const request = jest.fn().mockRejectedValue(wireError('search_pending'));

    await expect(
      retrySearchPending(request, { retries: 2, delayMs: 0 })
    ).rejects.toMatchObject({ message: 'search_pending' });
    expect(request).toHaveBeenCalledTimes(3);
  });

  it('reports other failures and cancelled searches immediately', async () => {
    const failed = jest.fn().mockRejectedValue(wireError('search_capacity'));
    await expect(
      retrySearchPending(failed, { delayMs: 0 })
    ).rejects.toMatchObject({ message: 'search_capacity' });
    expect(failed).toHaveBeenCalledTimes(1);

    const cancelled = jest.fn().mockRejectedValue(wireError('search_pending'));
    await expect(
      retrySearchPending(cancelled, {
        delayMs: 0,
        isCancelled: () => true,
      })
    ).rejects.toMatchObject({ message: 'search_pending' });
    expect(cancelled).toHaveBeenCalledTimes(1);
  });

  it('recognizes a terminal judgment failure without retrying it', async () => {
    expect(
      isSearchJudgmentFailedError(wireError('SEARCH_JUDGMENT_FAILED'))
    ).toBe(true);
    expect(isSearchJudgmentFailedError(wireError('search_pending'))).toBe(
      false
    );
    expect(isSearchJudgmentFailedError(new Error('network'))).toBe(false);

    const failed = jest
      .fn()
      .mockRejectedValue(wireError('search_judgment_failed'));
    await expect(
      retrySearchPending(failed, { delayMs: 0 })
    ).rejects.toMatchObject({ message: 'search_judgment_failed' });
    expect(failed).toHaveBeenCalledTimes(1);
  });
});

describe('search request payload', () => {
  it('keeps the V1 payload unchanged by default', () => {
    const payload = buildSearchRequestPayload('q', [], 'all', {
      offset: 0,
      limit: 20,
    });

    expect(payload).toMatchObject({ query: 'q', offset: 0, limit: 20 });
    expect(payload).not.toHaveProperty('pagination_version');
    expect(payload).not.toHaveProperty('request_id');
  });

  it('adds session identifiers for a V2 request', () => {
    const payload = buildSearchRequestPayload('q', [], 'all', {
      offset: 20,
      limit: 20,
      paginationVersion: 2,
      requestId: 'request-1',
      searchId: 'search-1',
    });

    expect(payload).toMatchObject({
      pagination_version: 2,
      request_id: 'request-1',
      search_id: 'search-1',
    });
  });

  it('creates distinct request identifiers', () => {
    const first = createSearchRequestId();
    const second = createSearchRequestId();

    expect(first).toBeTruthy();
    expect(second).toBeTruthy();
    expect(first).not.toBe(second);
  });
});
