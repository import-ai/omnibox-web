import { serializeResourceEditorContent } from './contentSerialization';

describe('serializeResourceEditorContent', () => {
  it('returns the markdown from payload', () => {
    expect(
      serializeResourceEditorContent({
        markdown: 'hello world',
      })
    ).toBe('hello world');
  });

  it('handles missing markdown by returning empty string', () => {
    expect(
      serializeResourceEditorContent({
        json: {},
      })
    ).toBe('');
  });
});
