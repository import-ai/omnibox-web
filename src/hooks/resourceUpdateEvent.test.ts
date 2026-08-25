import type { Resource } from '@/interface';

import {
  applyResourceUpdateDelta,
  getResourceEventId,
  isCurrentResourceDeleted,
  isNotFoundResourceError,
  shouldRefetchResourceContent,
} from './resourceUpdateEvent';

function resource(overrides: Partial<Resource> = {}): Resource {
  return {
    id: 'resource-a',
    name: 'Doc A',
    content: 'old body',
    has_children: false,
    resource_type: 'doc',
    space_type: 'private',
    parent_id: 'parent-a',
    path: [
      { id: 'parent-a', name: 'Parent' },
      { id: 'resource-a', name: 'Doc A' },
    ],
    ...overrides,
  };
}

describe('getResourceEventId', () => {
  it('reads an id string from copilot operations', () => {
    expect(getResourceEventId('resource-a')).toBe('resource-a');
    expect(getResourceEventId('')).toBeUndefined();
  });

  it('reads an id from a resource object', () => {
    expect(getResourceEventId(resource())).toBe('resource-a');
  });
});

describe('shouldRefetchResourceContent', () => {
  it('refetches when the current resource is announced by id', () => {
    expect(shouldRefetchResourceContent('resource-a', 'resource-a')).toBe(true);
  });

  it('ignores other resources, object payloads, and the edit page', () => {
    expect(shouldRefetchResourceContent('resource-b', 'resource-a')).toBe(
      false
    );
    expect(shouldRefetchResourceContent(resource(), 'resource-a')).toBe(false);
    expect(
      shouldRefetchResourceContent('resource-a', 'resource-a', false)
    ).toBe(false);
    expect(shouldRefetchResourceContent('resource-a', '')).toBe(false);
  });
});

describe('isCurrentResourceDeleted', () => {
  it('matches the currently displayed resource', () => {
    expect(isCurrentResourceDeleted('resource-a', 'resource-a')).toBe(true);
    expect(isCurrentResourceDeleted('resource-b', 'resource-a')).toBe(false);
    expect(isCurrentResourceDeleted(undefined, 'resource-a')).toBe(false);
  });
});

describe('isNotFoundResourceError', () => {
  it('detects a 404 response', () => {
    expect(isNotFoundResourceError({ response: { status: 404 } })).toBe(true);
    expect(isNotFoundResourceError({ response: { status: 500 } })).toBe(false);
    expect(isNotFoundResourceError(new Error('network'))).toBe(false);
  });
});

describe('applyResourceUpdateDelta', () => {
  it('merges content and name onto the current resource', () => {
    expect(
      applyResourceUpdateDelta(
        resource(),
        {
          ...resource(),
          name: 'Doc A renamed',
          content: 'new body',
          updated_at: '2026-08-24T00:00:00.000Z',
        },
        'resource-a'
      )
    ).toMatchObject({
      name: 'Doc A renamed',
      content: 'new body',
      updated_at: '2026-08-24T00:00:00.000Z',
    });
  });

  it('applies an empty content payload', () => {
    expect(
      applyResourceUpdateDelta(
        resource(),
        { ...resource(), content: '' },
        'resource-a'
      ).content
    ).toBe('');
  });

  it('updates an ancestor name in the breadcrumb path', () => {
    const next = applyResourceUpdateDelta(
      resource(),
      { id: 'parent-a', name: 'Parent renamed' } as Resource,
      'resource-a'
    );

    expect(next.content).toBe('old body');
    expect(next.path).toEqual([
      { id: 'parent-a', name: 'Parent renamed' },
      { id: 'resource-a', name: 'Doc A' },
    ]);
  });

  it('returns the same resource when the event is unrelated', () => {
    const current = resource();
    expect(
      applyResourceUpdateDelta(
        current,
        { id: 'resource-z', name: 'Other' } as Resource,
        'resource-a'
      )
    ).toBe(current);
  });
});
