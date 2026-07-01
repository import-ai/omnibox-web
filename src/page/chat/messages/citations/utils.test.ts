import {
  citationUrlTransform,
  copyPreprocess,
  findCitationById,
  isCitationId,
  replaceCiteTag,
  replaceReasoningCiteMarkers,
  trimIncompletedCitation,
} from './citationUtils';

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

describe('citation id helpers', () => {
  const citations = [
    {
      id: 'C1-resource-lines-L2-3',
      title: 'Resource',
      snippet: 'Snippet',
      link: 'resource-id',
    },
    {
      id: 'C2-web-title',
      title: 'Web',
      snippet: 'Snippet',
      link: 'https://example.com',
    },
  ];

  it('detects supported citation id formats', () => {
    expect(isCitationId('C1-resource-lines-L2-3')).toBe(true);
    expect(isCitationId('C2-web-title')).toBe(true);
    expect(isCitationId('web:abcdef123456')).toBe(false);
    expect(isCitationId('/private/example.md')).toBe(false);
    expect(isCitationId('#cite-1')).toBe(false);
  });

  it('finds citations by id', () => {
    expect(findCitationById(citations, 'C1-resource-lines-L2-3')).toEqual({
      citation: citations[0],
      index: 0,
    });
    expect(findCitationById(citations, 'C2-web-title')).toEqual({
      citation: citations[1],
      index: 1,
    });
  });

  it('does not resolve unmatched citation ids', () => {
    expect(findCitationById(citations, 'C3-not-found')).toBeUndefined();
    expect(findCitationById(citations, 'web:abcdef123456')).toBeUndefined();
  });

  it('finds citations when markdown percent-encodes ids', () => {
    const nonAsciiCitation = {
      id: 'C4-咖啡做法-L1-16',
      title: '咖啡做法1-手冲咖啡.md',
      snippet: 'Snippet',
      link: 'resource-id',
    };

    expect(
      findCitationById(
        [nonAsciiCitation],
        'C4-%E5%92%96%E5%95%A1%E5%81%9A%E6%B3%95-L1-16'
      )
    ).toEqual({ citation: nonAsciiCitation, index: 0 });
  });

  it('preserves citation ids for markdown link rendering', () => {
    expect(citationUrlTransform('C1-resource-lines-L2-3')).toBe(
      'C1-resource-lines-L2-3'
    );
    expect(citationUrlTransform('C2-web-title')).toBe('C2-web-title');
  });

  it('keeps normal url sanitization for non-citation links', () => {
    expect(citationUrlTransform('https://example.com')).toBe(
      'https://example.com'
    );
    expect(citationUrlTransform('javascript:alert(1)')).toBe('');
    expect(citationUrlTransform('web:abcdef123456')).toBe('');
  });
});

describe('citation marker replacement', () => {
  it('leaves linked citation markers for id-based rendering', () => {
    expect(replaceCiteTag('Answer. [[1]](C1-x) next', true, 1)).toBe(
      'Answer. [[1]](C1-x) next'
    );
  });

  it('keeps legacy citation marker behavior', () => {
    expect(replaceCiteTag('Answer. [[1]] next', true, 1)).toBe(
      'Answer. [[1]](#cite-1) next'
    );
  });

  it('keeps out-of-range linked markers for id-based rendering', () => {
    expect(replaceCiteTag('Answer. [[2]](C2-x) next', true, 1)).toBe(
      'Answer. [[2]](C2-x) next'
    );
  });

  it('converts only legacy raw markers in mixed citation content', () => {
    expect(replaceCiteTag('Old [[1]] and new [[2]](C2-x)', true, 2)).toBe(
      'Old [[1]](#cite-1) and new [[2]](C2-x)'
    );
  });
});

describe('reasoning citation marker replacement', () => {
  it('replaces linked citation markers with plain bracket labels', () => {
    expect(
      replaceReasoningCiteMarkers(
        'Think with [[1]](C1-water-temperature-L12-18).'
      )
    ).toBe('Think with [1].');
  });

  it('replaces raw citation markers with plain bracket labels', () => {
    expect(replaceReasoningCiteMarkers('Think with [[1]].')).toBe(
      'Think with [1].'
    );
  });

  it('replaces multiple markers independently', () => {
    expect(
      replaceReasoningCiteMarkers(
        'Use [[1]](C1-alpha) then [[2]] and [[12]](C12-z).'
      )
    ).toBe('Use [1] then [2] and [12].');
  });

  it('leaves normal markdown links and non-citation text unchanged', () => {
    expect(
      replaceReasoningCiteMarkers(
        'See [docs](https://example.com) and plain text.'
      )
    ).toBe('See [docs](https://example.com) and plain text.');
  });
});

describe('copyPreprocess', () => {
  const citations = [
    {
      id: 'C1-resource-lines-L2-3',
      title: 'Resource',
      snippet: 'Snippet',
      link: 'resource-id',
    },
    {
      id: 'C2-web-title',
      title: 'Web',
      snippet: 'Snippet',
      link: 'https://example.com',
    },
  ];

  beforeEach(() => {
    Object.defineProperty(globalThis, 'location', {
      value: {
        origin: 'https://omnibox.test',
        pathname: '/namespace-id/chat/conversation-id',
      },
      configurable: true,
      writable: true,
    });
  });

  it('resolves linked markers by citation id while copying', () => {
    expect(copyPreprocess('Answer. [[1]](C2-web-title) next', citations)).toBe(
      'Answer. [^2][2] next\n\n[1]: https://omnibox.test/namespace-id/resource-id "Resource"\n[2]: https://example.com "Web"\n'
    );
  });

  it('keeps legacy marker copy behavior', () => {
    expect(copyPreprocess('Answer. [[1]] next', citations)).toBe(
      'Answer. [^1][1] next\n\n[1]: https://omnibox.test/namespace-id/resource-id "Resource"\n[2]: https://example.com "Web"\n'
    );
  });
});
