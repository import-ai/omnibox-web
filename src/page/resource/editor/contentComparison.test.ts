import type { TiptapJsonContent } from '@import-ai/omnibox-editor';

import { isDocumentChanged, toComparableDocument } from './contentComparison';

function documentWith(content: TiptapJsonContent[]): TiptapJsonContent {
  return { type: 'doc', content };
}

describe('contentComparison', () => {
  it('ignores editor-generated ids and runtime defaults', () => {
    const server = documentWith([
      {
        type: 'heading',
        attrs: { level: 1, id: 'toc-1', 'data-toc-id': 'toc-1' },
        content: [{ type: 'text', text: 'Title' }],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Long link',
            marks: [
              { type: 'link', attrs: { href: 'https://example.com/a?x=1' } },
            ],
          },
        ],
      },
    ]);
    const editor = documentWith([
      {
        type: 'heading',
        attrs: {
          id: 'toc-1',
          level: 1,
          textAlign: null,
          backgroundColor: null,
          nodeTextAlign: null,
          nodeVerticalAlign: null,
          indent: 0,
          'data-toc-id': 'toc-1',
        },
        content: [{ type: 'text', text: 'Title' }],
      },
      {
        type: 'paragraph',
        attrs: {
          id: '71e9cae0-2b64-4d70-84b0-9b2332e0114f',
          textAlign: null,
          indent: 0,
        },
        content: [
          {
            type: 'text',
            text: 'Long link',
            marks: [
              {
                type: 'link',
                attrs: {
                  href: 'https://example.com/a?x=1',
                  target: '_blank',
                  rel: 'noopener noreferrer nofollow',
                  class: null,
                  title: null,
                },
              },
            ],
          },
        ],
      },
    ]);

    expect(toComparableDocument(editor)).toBe(toComparableDocument(server));
    expect(isDocumentChanged(toComparableDocument(server), editor)).toBe(false);
  });

  it('ignores comments, mention labels and upload placeholders', () => {
    const baseline = documentWith([
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Hello ' },
          { type: 'mention', attrs: { id: 'user-1', label: 'Old name' } },
        ],
      },
    ]);
    const current = documentWith([
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Hello ',
            marks: [{ type: 'resourceComment', attrs: { threadId: 'thread' } }],
          },
          {
            type: 'mention',
            attrs: {
              id: 'user-1',
              label: 'New name',
              mentionSuggestionChar: '@',
            },
          },
        ],
      },
      { type: 'imageUpload', attrs: { limit: 1 } },
    ]);

    expect(isDocumentChanged(toComparableDocument(baseline), current)).toBe(
      false
    );
  });

  it('detects mention identity changes while ignoring presentation attributes', () => {
    const baseline = toComparableDocument(
      documentWith([
        {
          type: 'paragraph',
          content: [
            {
              type: 'mention',
              attrs: {
                id: 'user-1',
                label: 'Old name',
                mentionSuggestionChar: '@',
              },
            },
          ],
        },
      ])
    );

    expect(
      isDocumentChanged(
        baseline,
        documentWith([
          {
            type: 'paragraph',
            content: [
              {
                type: 'mention',
                attrs: {
                  id: 'user-2',
                  label: 'Old name',
                  mentionSuggestionChar: '@',
                },
              },
            ],
          },
        ])
      )
    ).toBe(true);
  });

  it('detects real link, whitespace, code and image changes', () => {
    const baseline = toComparableDocument(
      documentWith([
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'link',
              marks: [
                {
                  type: 'link',
                  attrs: {
                    href: 'https://www.xiaohongshu.com/explore/1?xsec_token=a',
                  },
                },
              ],
            },
          ],
        },
        {
          type: 'codeBlock',
          attrs: { language: 'ts' },
          content: [{ type: 'text', text: 'const a = 1;' }],
        },
        {
          type: 'image',
          attrs: { src: 'https://example.com/a.png', width: 320 },
        },
      ])
    );

    expect(
      isDocumentChanged(
        baseline,
        documentWith([
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'link',
                marks: [
                  {
                    type: 'link',
                    attrs: {
                      href: 'https://www.xiaohongshu.com/explore/1?xsec_token=b',
                    },
                  },
                ],
              },
            ],
          },
          {
            type: 'codeBlock',
            attrs: { language: 'ts' },
            content: [{ type: 'text', text: 'const a = 1; ' }],
          },
          {
            type: 'image',
            attrs: { src: 'https://example.com/a.png', width: 320 },
          },
        ])
      )
    ).toBe(true);
  });

  it('detects editable image property changes', () => {
    const baseline = toComparableDocument(
      documentWith([
        {
          type: 'image',
          attrs: {
            src: 'https://example.com/a.png',
            width: 320,
            height: 180,
            align: 'center',
          },
        },
      ])
    );

    expect(
      isDocumentChanged(
        baseline,
        documentWith([
          {
            type: 'image',
            attrs: {
              src: 'https://example.com/a.png',
              width: 480,
              height: 180,
              align: 'center',
            },
          },
        ])
      )
    ).toBe(true);
  });

  it('preserves paragraphs and blank lines inside the document', () => {
    const baseline = toComparableDocument(
      documentWith([
        { type: 'paragraph', content: [{ type: 'text', text: 'First' }] },
        { type: 'paragraph' },
        { type: 'paragraph', content: [{ type: 'text', text: 'Second' }] },
      ])
    );

    expect(
      isDocumentChanged(
        baseline,
        documentWith([
          { type: 'paragraph', content: [{ type: 'text', text: 'First' }] },
          { type: 'paragraph', content: [{ type: 'text', text: 'Second' }] },
        ])
      )
    ).toBe(true);
  });

  it('only ignores the single terminal paragraph added by the editor', () => {
    const baseline = toComparableDocument(
      documentWith([
        { type: 'paragraph', content: [{ type: 'text', text: 'First' }] },
      ])
    );

    expect(
      isDocumentChanged(
        baseline,
        documentWith([
          { type: 'paragraph', content: [{ type: 'text', text: 'First' }] },
          { type: 'paragraph' },
          { type: 'paragraph' },
        ])
      )
    ).toBe(true);
  });

  it('detects a blank paragraph added after ordinary text', () => {
    const baseline = toComparableDocument(
      documentWith([
        { type: 'paragraph', content: [{ type: 'text', text: 'First' }] },
      ])
    );

    expect(
      isDocumentChanged(
        baseline,
        documentWith([
          { type: 'paragraph', content: [{ type: 'text', text: 'First' }] },
          { type: 'paragraph' },
        ])
      )
    ).toBe(true);
  });

  it('ignores one editor padding paragraph after block content', () => {
    const codeBlock: TiptapJsonContent = {
      type: 'codeBlock',
      attrs: { language: 'ts' },
      content: [{ type: 'text', text: 'const value = 1;' }],
    };
    const baseline = toComparableDocument(documentWith([codeBlock]));

    expect(
      isDocumentChanged(
        baseline,
        documentWith([codeBlock, { type: 'paragraph' }])
      )
    ).toBe(false);
  });

  it('detects an extra blank paragraph after editor padding', () => {
    const codeBlock: TiptapJsonContent = {
      type: 'codeBlock',
      attrs: { language: 'ts' },
      content: [{ type: 'text', text: 'const value = 1;' }],
    };
    const baseline = toComparableDocument(
      documentWith([codeBlock, { type: 'paragraph' }])
    );

    expect(
      isDocumentChanged(
        baseline,
        documentWith([codeBlock, { type: 'paragraph' }, { type: 'paragraph' }])
      )
    ).toBe(true);
  });
});
