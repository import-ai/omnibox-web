import { renderToStaticMarkup } from 'react-dom/server';

import type { Resource } from '@/interface';

import {
  APIKeyPermissionScope,
  buildAPIKeyPermissionScopes,
} from './APIKeyPermissionScope';

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

  it('renders a translated root as a truncated resource link', () => {
    const html = renderToStaticMarkup(
      <APIKeyPermissionScope
        namespaceId="namespace"
        resourceId="private-root"
        scope={{ rootType: 'private' }}
      />
    );

    expect(html).toContain('href="/namespace/private-root"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('title="Personal"');
    expect(html).toContain('max-w-full truncate');
    expect(html).toContain('>Personal</a>');
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
