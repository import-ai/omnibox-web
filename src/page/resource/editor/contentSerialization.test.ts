import {
  sanitizeEditorJsonForSave,
  serializeResourceEditorContent,
  shouldSaveOmniboxEditorJson,
} from './contentSerialization';

const jsonContent = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'hello' }],
    },
  ],
};

describe('serializeResourceEditorContent', () => {
  it('stores Tiptap JSON when JSON saving is enabled', () => {
    expect(
      serializeResourceEditorContent(
        {
          json: jsonContent,
          markdown: 'hello',
          html: '<p>hello</p>',
        },
        true
      )
    ).toBe(JSON.stringify(jsonContent));
  });

  it('stores Markdown when JSON saving is disabled', () => {
    expect(
      serializeResourceEditorContent(
        {
          json: jsonContent,
          markdown: 'hello',
          html: '<p>hello</p>',
        },
        false
      )
    ).toBe('hello');
  });

  it('falls back to JSON when Markdown saving is disabled but Markdown is missing', () => {
    expect(
      serializeResourceEditorContent(
        {
          json: jsonContent,
          html: '<p>hello</p>',
        },
        false
      )
    ).toBe(JSON.stringify(jsonContent));
  });

  it('drops unfinished imageUpload placeholders from saved JSON', () => {
    const withPlaceholder = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'hello' }],
        },
        {
          type: 'imageUpload',
          attrs: { accept: 'image/*', limit: 1, maxSize: 0 },
        },
      ],
    };

    expect(
      serializeResourceEditorContent(
        {
          json: withPlaceholder,
          markdown: 'hello',
        },
        true
      )
    ).toBe(
      JSON.stringify({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'hello' }],
          },
        ],
      })
    );
  });
});

describe('sanitizeEditorJsonForSave', () => {
  it('removes imageUpload nodes while keeping completed images', () => {
    expect(
      sanitizeEditorJsonForSave({
        type: 'doc',
        content: [
          {
            type: 'imageUpload',
            attrs: { accept: 'image/*', limit: 1, maxSize: 0 },
          },
          {
            type: 'image',
            attrs: { src: 'attachments/a.png' },
          },
        ],
      })
    ).toEqual({
      type: 'doc',
      content: [
        {
          type: 'image',
          attrs: { src: 'attachments/a.png' },
        },
      ],
    });
  });
});

describe('shouldSaveOmniboxEditorJson', () => {
  it('defaults to JSON unless the flag is explicitly false', () => {
    expect(shouldSaveOmniboxEditorJson()).toBe(true);
    expect(shouldSaveOmniboxEditorJson('true')).toBe(true);
    expect(shouldSaveOmniboxEditorJson('FALSE')).toBe(false);
    expect(shouldSaveOmniboxEditorJson('false')).toBe(false);
  });
});
