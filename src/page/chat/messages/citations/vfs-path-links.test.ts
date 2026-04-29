import {
  getVfsResourceHref,
  remarkVfsPathLinks,
  splitTextWithVfsPathLinks,
} from './vfs-path-links';

const mappings = {
  '/private': 'private-root-id',
  '/private/foo/bar': 'private-id',
  '/private/foz/baz': 'quoted-id',
  '/teamspace': 'team-root-id',
  '/teamspace/docs/a.md': 'team-id',
  '/share': 'share-root-id',
  '/share/docs/a.md': 'share-id',
};

function serialize(value: string, prefix = '/ns') {
  return splitTextWithVfsPathLinks(value, mappings, prefix);
}

describe('vfs path links', () => {
  it('links quoted paths without consuming quotes', () => {
    expect(serialize('Open "/private/foz/baz".')).toEqual([
      { type: 'text', value: 'Open "' },
      {
        type: 'link',
        url: '/ns/quoted-id',
        title: null,
        children: [{ type: 'text', value: '/private/foz/baz' }],
      },
      { type: 'text', value: '".' },
    ]);
  });

  it('links plain teamspace paths', () => {
    expect(serialize('See /teamspace/docs/a.md now.')).toContainEqual({
      type: 'link',
      url: '/ns/team-id',
      title: null,
      children: [{ type: 'text', value: '/teamspace/docs/a.md' }],
    });
  });

  it('links paths followed by sentence punctuation', () => {
    expect(serialize('See /private/foo/bar.')).toEqual([
      { type: 'text', value: 'See ' },
      {
        type: 'link',
        url: '/ns/private-id',
        title: null,
        children: [{ type: 'text', value: '/private/foo/bar' }],
      },
      { type: 'text', value: '.' },
    ]);
  });

  it('links root vfs paths', () => {
    expect(serialize('/private, /teamspace, and /share')).toEqual([
      {
        type: 'link',
        url: '/ns/private-root-id',
        title: null,
        children: [{ type: 'text', value: '/private' }],
      },
      { type: 'text', value: ', ' },
      {
        type: 'link',
        url: '/ns/team-root-id',
        title: null,
        children: [{ type: 'text', value: '/teamspace' }],
      },
      { type: 'text', value: ', and ' },
      {
        type: 'link',
        url: '/ns/share-root-id',
        title: null,
        children: [{ type: 'text', value: '/share' }],
      },
    ]);
  });

  it('builds share route links for share paths', () => {
    expect(getVfsResourceHref('/share/docs/a.md', mappings, '/s/share-1')).toBe(
      '/s/share-1/share-id'
    );
  });

  it('builds inline code hrefs with the normal route prefix', () => {
    expect(
      getVfsResourceHref('/private/foo/bar', mappings, '/namespace-1')
    ).toBe('/namespace-1/private-id');
  });

  it('does not link unmapped paths', () => {
    expect(serialize('Missing /private/nope.md')).toEqual([
      { type: 'text', value: 'Missing /private/nope.md' },
    ]);
  });

  it('does not match a mapped path inside a longer path', () => {
    expect(serialize('/private/foo/bar/baz')).toEqual([
      { type: 'text', value: '/private/foo/bar/baz' },
    ]);
  });

  it('does not rewrite existing links or fenced code nodes', () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'link',
          url: 'https://example.com',
          children: [{ type: 'text', value: '/private/foo/bar' }],
        },
        { type: 'code', value: '/teamspace/docs/a.md' },
      ],
    };

    remarkVfsPathLinks(mappings, '/ns')(tree);

    expect(tree.children).toEqual([
      {
        type: 'link',
        url: 'https://example.com',
        children: [{ type: 'text', value: '/private/foo/bar' }],
      },
      { type: 'code', value: '/teamspace/docs/a.md' },
    ]);
  });
});
