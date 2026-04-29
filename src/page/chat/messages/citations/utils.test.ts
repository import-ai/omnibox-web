import {
  citationUrlTransform,
  findCitationByCiteRef,
  isCiteRef,
  trimIncompletedCitation,
} from './citation-utils';

describe('cleanIncompletedCitation', () => {
  it('removes incomplete [ at the end', () => {
    expect(trimIncompletedCitation('hello [')).toBe('hello ');
    expect(trimIncompletedCitation('test [')).toBe('test ');
  });

  it('removes incomplete [[ at the end', () => {
    expect(trimIncompletedCitation('hello [[')).toBe('hello ');
    expect(trimIncompletedCitation('test [[')).toBe('test ');
  });

  it('removes incomplete [[1 at the end', () => {
    expect(trimIncompletedCitation('foo [[1')).toBe('foo ');
    expect(trimIncompletedCitation('bar [[12')).toBe('bar ');
  });

  it('removes incomplete [[1] at the end', () => {
    expect(trimIncompletedCitation('baz [[1]')).toBe('baz ');
    expect(trimIncompletedCitation('qux [[12]')).toBe('qux ');
  });

  it('does not remove complete citations', () => {
    expect(trimIncompletedCitation('done [[1]]')).toBe('done [[1]]');
    expect(trimIncompletedCitation('ok [[12]]')).toBe('ok [[12]]');
  });

  it('returns unchanged text if no incomplete citation', () => {
    expect(trimIncompletedCitation('no citation here')).toBe(
      'no citation here'
    );
  });
});

describe('cite_ref helpers', () => {
  const citations = [
    {
      id: 'message-id',
      title: 'Resource',
      snippet: 'Snippet',
      link: 'resource-id',
      cite_ref: 'vfs:/private/example.md:2-3',
    },
    {
      id: 'message-id',
      title: 'Web',
      snippet: 'Snippet',
      link: 'https://example.com',
      cite_ref: 'web:abcdef123456',
    },
  ];

  it('detects supported cite_ref formats', () => {
    expect(isCiteRef('vfs:/private/example.md:2-3')).toBe(true);
    expect(isCiteRef('web:abcdef123456')).toBe(true);
    expect(isCiteRef('/private/example.md')).toBe(false);
    expect(isCiteRef('#cite-1')).toBe(false);
  });

  it('finds citations by cite_ref', () => {
    expect(
      findCitationByCiteRef(citations, 'vfs:/private/example.md:2-3')
    ).toEqual({ citation: citations[0], index: 0 });
    expect(findCitationByCiteRef(citations, 'web:abcdef123456')).toEqual({
      citation: citations[1],
      index: 1,
    });
  });

  it('does not resolve unmatched cite_ref values', () => {
    expect(findCitationByCiteRef(citations, 'web:notfound')).toBeUndefined();
  });

  it('finds vfs citations when markdown percent-encodes non-ascii paths', () => {
    const nonAsciiCitation = {
      id: 'message-id',
      title: '咖啡做法1-手冲咖啡.md',
      snippet: 'Snippet',
      link: 'resource-id',
      cite_ref: 'vfs:/private/test/咖啡做法1-手冲咖啡.md:1-16',
    };

    expect(
      findCitationByCiteRef(
        [nonAsciiCitation],
        'vfs:/private/test/%E5%92%96%E5%95%A1%E5%81%9A%E6%B3%951-%E6%89%8B%E5%86%B2%E5%92%96%E5%95%A1.md:1-16'
      )
    ).toEqual({ citation: nonAsciiCitation, index: 0 });
  });

  it('preserves cite_ref urls for markdown link rendering', () => {
    expect(citationUrlTransform('vfs:/private/example.md:2-3')).toBe(
      'vfs:/private/example.md:2-3'
    );
    expect(citationUrlTransform('web:abcdef123456')).toBe('web:abcdef123456');
  });

  it('keeps normal url sanitization for non-cite links', () => {
    expect(citationUrlTransform('https://example.com')).toBe(
      'https://example.com'
    );
    expect(citationUrlTransform('javascript:alert(1)')).toBe('');
  });
});
