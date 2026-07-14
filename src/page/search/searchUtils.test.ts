import { describe, expect, it } from 'vitest';

import {
  buildSearchPreview,
  extractTextFromPossiblyTruncatedTiptapJson,
  toSearchPreviewText,
} from './searchUtils';

describe('search preview', () => {
  it('converts full Tiptap JSON into markdown-like preview text', () => {
    const json = JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1, id: 'h1' },
          content: [{ type: 'text', text: '使用 Tailscale 连接办公室网络' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '连接信息如下' }],
        },
      ],
    });

    const preview = buildSearchPreview(json);
    expect(preview).toContain('使用 Tailscale 连接办公室网络');
    expect(preview).toContain('连接信息如下');
    expect(preview).not.toContain('"type":"doc"');
    expect(preview).not.toContain('"attrs"');
  });

  it('extracts text from API-truncated Tiptap JSON (summary=true)', () => {
    const full = JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: {
            id: 'c0c9a689-200d-4d74-94d5-a71b4ccfb786',
            level: 1,
          },
          content: [{ type: 'text', text: '我再来新建一个标题正文' }],
        },
      ],
    });
    // Simulate summary truncation mid-JSON (before/around text field).
    const truncatedMid = full.slice(0, 100);
    expect(truncatedMid.includes('"type":"doc"')).toBe(true);

    // Truncation after the text value is present.
    const withText = `{"type":"doc","content":[{"type":"heading","attrs":{"id":"x"},"content":[{"type":"text","text":"我再来新建一个标题正文"},{"type":"tex`;
    const extracted = extractTextFromPossiblyTruncatedTiptapJson(withText);
    expect(extracted).toBe('我再来新建一个标题正文');
    expect(buildSearchPreview(withText)).toBe('我再来新建一个标题正文');
    expect(buildSearchPreview(withText)).not.toContain('"type"');

    // If truncation cuts before any text field, hide rather than leak JSON.
    expect(buildSearchPreview(truncatedMid)).toBe('');
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
