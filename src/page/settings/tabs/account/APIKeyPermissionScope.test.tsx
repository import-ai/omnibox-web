import { renderToStaticMarkup } from 'react-dom/server';

import type { Resource } from '@/interface';
import { fetchResourcesByIds, fetchRootResources } from '@/service/resource';

import {
  APIKeyPermissionScope,
  buildAPIKeyPermissionScopes,
  fetchAPIKeyPermissionScopes,
} from './APIKeyPermissionScope';

jest.mock('@/service/resource', () => ({
  fetchResourcesByIds: jest.fn(),
  fetchRootResources: jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        'api_key.personal': 'Personal',
        'api_key.resource_not_found': 'Resource not found',
        teamspace: 'Teamspace',
      })[key] ?? key,
  }),
}));

describe('APIKeyPermissionScope', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps resource names and root types in one batch', () => {
    const scopes = buildAPIKeyPermissionScopes(
      ['private-root', 'resource', 'missing'],
      [{ id: 'resource', name: 'Project notes' } as Resource],
      { private: { id: 'private-root' } as Resource }
    );

    expect(scopes).toEqual({
      'private-root': { rootType: 'private' },
      resource: { name: 'Project notes' },
      missing: {},
    });
  });

  it('does not expose resource links when the root request fails', async () => {
    jest
      .mocked(fetchResourcesByIds)
      .mockResolvedValue([
        { id: 'private-root', name: 'Private root' } as Resource,
      ]);
    jest.mocked(fetchRootResources).mockRejectedValue(new Error('network'));

    const scopes = await fetchAPIKeyPermissionScopes('namespace', [
      'private-root',
    ]);
    const html = renderToStaticMarkup(
      <APIKeyPermissionScope
        namespaceId="namespace"
        resourceId="private-root"
        scope={scopes['private-root']}
      />
    );

    expect(html).toContain('Resource not found');
    expect(html).not.toContain('<a');
    expect(fetchResourcesByIds).toHaveBeenCalledWith(
      'namespace',
      ['private-root'],
      expect.objectContaining({ mute: true })
    );
    expect(fetchRootResources).toHaveBeenCalledWith(
      'namespace',
      expect.objectContaining({ mute: true })
    );
  });

  it.each([
    ['private', 'Personal'],
    ['teamspace', 'Teamspace'],
  ])('renders the %s root as truncated text', (rootType, label) => {
    const html = renderToStaticMarkup(
      <APIKeyPermissionScope
        namespaceId="namespace"
        resourceId="private-root"
        scope={{ rootType }}
      />
    );

    expect(html).not.toContain('<a');
    expect(html).toContain(`title="${label}"`);
    expect(html).toContain('max-w-full truncate');
    expect(html).toContain(`>${label}</span>`);
  });

  it('renders a resource as a truncated link', () => {
    const html = renderToStaticMarkup(
      <APIKeyPermissionScope
        namespaceId="namespace"
        resourceId="resource"
        scope={{ name: 'Project notes' }}
      />
    );

    expect(html).toContain('href="/namespace/resource"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('title="Project notes"');
    expect(html).toContain('max-w-full truncate');
    expect(html).toContain('>Project notes</a>');
  });

  it('renders an inaccessible resource without a link', () => {
    const html = renderToStaticMarkup(
      <APIKeyPermissionScope
        namespaceId="namespace"
        resourceId="missing"
        scope={{}}
      />
    );

    expect(html).toContain('Resource not found');
    expect(html).not.toContain('<a');
  });
});
