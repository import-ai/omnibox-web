import type { Resource } from '@/interface';

import { resolveResourceDocumentTitle } from './userResource';

jest.mock('@/const', () => ({ SITE_NAME: 'OmniBox' }));
jest.mock('@/lib/request', () => ({ http: { get: jest.fn() } }));

describe('resolveResourceDocumentTitle', () => {
  it('keeps the current title while the next resource is loading', () => {
    const staleResource = {
      id: 'resource-a',
      name: 'Resource A',
    } as Resource;

    expect(
      resolveResourceDocumentTitle('resource-b', staleResource, 'Untitled')
    ).toBeNull();
  });

  it('returns the matching resource title', () => {
    const resource = {
      id: 'resource-b',
      name: 'Resource B',
    } as Resource;

    expect(
      resolveResourceDocumentTitle('resource-b', resource, 'Untitled')
    ).toBe('Resource B');
  });

  it('uses the site title outside a resource route', () => {
    expect(resolveResourceDocumentTitle('', null, 'Untitled')).toBe('OmniBox');
  });
});
