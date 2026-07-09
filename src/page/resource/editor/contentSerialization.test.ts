import {
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
});

describe('shouldSaveOmniboxEditorJson', () => {
  it('defaults to JSON unless the flag is explicitly false', () => {
    expect(shouldSaveOmniboxEditorJson()).toBe(true);
    expect(shouldSaveOmniboxEditorJson('true')).toBe(true);
    expect(shouldSaveOmniboxEditorJson('FALSE')).toBe(false);
    expect(shouldSaveOmniboxEditorJson('false')).toBe(false);
  });
});
