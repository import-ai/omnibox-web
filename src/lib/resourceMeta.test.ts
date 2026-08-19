import { normalizeResourceMeta } from './resourceMeta';

describe('normalizeResourceMeta', () => {
  it('draws an ordinary resource attached as "all files" like a folder', () => {
    const meta = normalizeResourceMeta(
      { id: 'r1', resource_type: 'doc', has_children: true },
      { contextType: 'folder' }
    );

    expect(meta.resource_type).toBe('folder');
  });

  it.each(['smart_folder', 'rss_folder'] as const)(
    'keeps a %s as itself so it renders its own icon',
    resourceType => {
      const meta = normalizeResourceMeta(
        { id: 'r1', resource_type: resourceType },
        { contextType: 'folder' }
      );

      expect(meta.resource_type).toBe(resourceType);
    }
  );

  it('leaves the type alone when the resource is attached on its own', () => {
    const meta = normalizeResourceMeta(
      { id: 'r1', resource_type: 'rss_item' },
      { contextType: 'resource' }
    );

    expect(meta.resource_type).toBe('rss_item');
  });
});
