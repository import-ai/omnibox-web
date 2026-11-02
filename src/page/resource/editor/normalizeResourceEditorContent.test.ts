import type { TiptapJsonContent } from '@import-ai/omnibox-editor';

import { normalizeResourceEditorContent } from './normalizeResourceEditorContent';

describe('normalizeResourceEditorContent', () => {
  it.each([undefined, []])(
    'gives an empty quote valid child content (%j)',
    content => {
      const quote: TiptapJsonContent = {
        type: 'blockquote',
        attrs: { id: 'existing-quote' },
        content,
      };
      const before = JSON.stringify(quote);
      expect(normalizeResourceEditorContent(quote)).toEqual({
        ...quote,
        content: [{ type: 'paragraph' }],
      });
      expect(JSON.stringify(quote)).toBe(before);
    }
  );

  it('repairs repeated quotes and quotes nested inside lists', () => {
    const document: TiptapJsonContent = {
      type: 'doc',
      content: [
        { type: 'blockquote', content: [] },
        { type: 'blockquote' },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Item' }],
                },
                { type: 'blockquote', content: [] },
              ],
            },
          ],
        },
      ],
    };
    const repaired = normalizeResourceEditorContent(document);
    expect(repaired.content?.[0].content).toEqual([{ type: 'paragraph' }]);
    expect(repaired.content?.[1].content).toEqual([{ type: 'paragraph' }]);
    expect(repaired.content?.[2].content?.[0].content?.[1].content).toEqual([
      { type: 'paragraph' },
    ]);
    expect(document.content?.[0].content).toEqual([]);
    expect(normalizeResourceEditorContent(repaired)).toBe(repaired);
  });

  it('preserves valid quotes, marks and media without copying or rewriting', () => {
    const document: TiptapJsonContent = {
      type: 'doc',
      content: [
        {
          type: 'blockquote',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Original quote',
                  marks: [
                    { type: 'resourceComment', attrs: { threadId: '1' } },
                  ],
                },
              ],
            },
            { type: 'image', attrs: { src: '/original.png' } },
            {
              type: 'iframeEmbed',
              attrs: { src: 'https://example.com/video' },
            },
          ],
        },
      ],
    };
    expect(normalizeResourceEditorContent(document)).toBe(document);
  });
});
