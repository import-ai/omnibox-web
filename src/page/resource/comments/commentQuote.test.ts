import { formatResourceCommentQuote } from './commentQuote';

describe('resource comment quotes', () => {
  it('shows a readable image label for stored image quotes', () => {
    expect(
      formatResourceCommentQuote(
        'omnibox-image:{"alt":"86486AF0-851A-42FF.png","src":"https://example.com/dog.png"}',
        '[图片]'
      )
    ).toBe('[图片]');
    expect(formatResourceCommentQuote('[图片]', '[Image]')).toBe('[Image]');
    expect(formatResourceCommentQuote('[Image]', '[图片]')).toBe('[图片]');
  });

  it('leaves text quotes unchanged', () => {
    expect(formatResourceCommentQuote('selected text', '图片')).toBe(
      'selected text'
    );
  });
});
