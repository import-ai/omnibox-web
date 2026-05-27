import {
  getVfsResourceDisplayName,
  getVfsResourceHref,
  getVfsRootPathLabel,
  remarkVfsPathLinks,
  splitTextWithVfsPathLinks,
} from './vfsPathLinks';

const generatedResourceTitle = '生成的测试资源标题';
const generatedResourcePath = `/private/${generatedResourceTitle}`;
const encodedGeneratedResourcePath = `/private/${encodeURIComponent(generatedResourceTitle)}`;

const mappings = {
  '/private': 'private-root-id',
  '/private/foo/bar': 'private-id',
  '/private/foz/baz': 'quoted-id',
  '/private/story3.md': 'story-id',
  '/teamspace': 'team-root-id',
  '/teamspace/docs/a.md': 'team-id',
  '/share': 'share-root-id',
  '/share/docs/a.md': 'share-id',
  [generatedResourcePath]: 'generated-id',
};

const titles = {
  '/private/foo/bar': 'Foo Bar',
  [generatedResourcePath]: generatedResourceTitle,
};

const rootLabels = {
  '/private': 'Private',
  '/teamspace': 'Teamspace',
  '/share': 'Share',
};

function serialize(value: string, prefix = '/ns', pathTitles = {}) {
  return splitTextWithVfsPathLinks(
    value,
    mappings,
    prefix,
    pathTitles,
    rootLabels
  );
}

describe('vfs path links', () => {
  it('links quoted paths without consuming quotes', () => {
    expect(serialize('Open "/private/foz/baz".', '/ns')).toEqual([
      { type: 'text', value: 'Open "' },
      {
        type: 'link',
        url: '/ns/quoted-id',
        title: null,
        children: [{ type: 'text', value: 'baz' }],
      },
      { type: 'text', value: '".' },
    ]);
  });

  it('uses resource titles for linked raw vfs paths when available', () => {
    expect(serialize('See /private/foo/bar.', '/ns', titles)).toEqual([
      { type: 'text', value: 'See ' },
      {
        type: 'link',
        url: '/ns/private-id',
        title: null,
        children: [{ type: 'text', value: 'Foo Bar' }],
      },
      { type: 'text', value: '.' },
    ]);
  });

  it('links plain teamspace paths', () => {
    expect(serialize('See /teamspace/docs/a.md now.')).toContainEqual({
      type: 'link',
      url: '/ns/team-id',
      title: null,
      children: [{ type: 'text', value: 'a.md' }],
    });
  });

  it('links paths followed by sentence punctuation', () => {
    expect(serialize('See /private/foo/bar.')).toEqual([
      { type: 'text', value: 'See ' },
      {
        type: 'link',
        url: '/ns/private-id',
        title: null,
        children: [{ type: 'text', value: 'bar' }],
      },
      { type: 'text', value: '.' },
    ]);
  });

  it('uses the file name as the fallback label for linked vfs resource paths', () => {
    expect(serialize('Open /private/story3.md.')).toEqual([
      { type: 'text', value: 'Open ' },
      {
        type: 'link',
        url: '/ns/story-id',
        title: null,
        children: [{ type: 'text', value: 'story3.md' }],
      },
      { type: 'text', value: '.' },
    ]);
    expect(getVfsResourceDisplayName('/private/story3.md')).toBe('story3.md');
  });

  it('renders root vfs paths as plain localized labels', () => {
    expect(serialize('/private, /teamspace, and /share')).toEqual([
      { type: 'text', value: 'Private, ' },
      { type: 'text', value: 'Teamspace, and ' },
      { type: 'text', value: 'Share' },
    ]);
  });

  it('does not build resource hrefs for root vfs paths', () => {
    expect(getVfsResourceHref('/private', mappings, '/ns')).toBeUndefined();
    expect(getVfsResourceHref('/teamspace', mappings, '/ns')).toBeUndefined();
    expect(getVfsResourceHref('/share', mappings, '/ns')).toBeUndefined();
    expect(getVfsRootPathLabel('/private', rootLabels)).toBe('Private');
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

  it('rewrites existing vfs links with resource titles and leaves external links or fenced code nodes unchanged', () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'link',
          url: 'https://example.com',
          children: [{ type: 'text', value: '/private/foo/bar' }],
        },
        {
          type: 'link',
          url: '/private/foo/bar',
          children: [{ type: 'text', value: 'Foo' }],
        },
        {
          type: 'link',
          url: '/private',
          children: [{ type: 'text', value: '/private' }],
        },
        { type: 'code', value: '/teamspace/docs/a.md' },
      ],
    };

    remarkVfsPathLinks(mappings, '/ns', titles, rootLabels)(tree);

    expect(tree.children).toEqual([
      {
        type: 'link',
        url: 'https://example.com',
        children: [{ type: 'text', value: '/private/foo/bar' }],
      },
      {
        type: 'link',
        url: '/ns/private-id',
        children: [{ type: 'text', value: 'Foo Bar' }],
      },
      { type: 'text', value: 'Private' },
      { type: 'code', value: '/teamspace/docs/a.md' },
    ]);
  });

  it('resolves percent-encoded vfs link hrefs', () => {
    expect(
      getVfsResourceHref(encodedGeneratedResourcePath, mappings, '/ns')
    ).toBe('/ns/generated-id');
  });
});
