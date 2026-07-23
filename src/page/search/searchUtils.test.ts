import { buildSearchPreview, toSearchPreviewText } from './searchUtils';

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
