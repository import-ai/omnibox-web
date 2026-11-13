import { appendSearchItems, SearchPageCursor } from './searchPagination';

it('uses the server offset rather than displayed item count', () => {
  const cursor = new SearchPageCursor(() => 'req');
  const first = cursor.request({ query: 'q', limit: 20 }, true);
  expect(first).toMatchObject({
    offset: 0,
    pagination_version: 2,
    request_id: 'req',
  });
  expect(
    cursor.accept({
      items: [{ resource_id: 'a' }],
      total: null,
      search_id: 'session',
      next_offset: 4,
      has_more: true,
      status: 'partial',
    })
  ).toBe(true);
  expect(cursor.request({ query: 'q', limit: 20 }, true)).toMatchObject({
    offset: 4,
    search_id: 'session',
  });
});

it('reuses the exact request on transport retry and creates a fresh continuation after partial empty', () => {
  let id = 0;
  const cursor = new SearchPageCursor(() => String(++id));
  const first = cursor.request({ query: 'q', limit: 20 }, true);
  expect(cursor.request({ query: 'q', limit: 20 }, true)).toBe(first);
  expect(
    cursor.accept({
      items: [],
      total: null,
      search_id: 's',
      next_offset: 0,
      has_more: true,
      status: 'partial',
    })
  ).toBe(true);
  expect(cursor.request({ query: 'q', limit: 20 }, true)).toMatchObject({
    offset: 0,
    request_id: '2',
    search_id: 's',
  });
});

it('rejects changed sessions and backwards offsets without accepting the page', () => {
  const cursor = new SearchPageCursor(() => 'r');
  cursor.request({}, true);
  cursor.accept({
    items: [],
    total: 40,
    search_id: 's',
    next_offset: 20,
    has_more: true,
  });
  expect(() =>
    cursor.accept({
      items: [],
      total: 40,
      search_id: 'other',
      next_offset: 40,
      has_more: false,
    })
  ).toThrow();
  expect(() =>
    cursor.accept({
      items: [],
      total: 40,
      search_id: 's',
      next_offset: 0,
      has_more: false,
    })
  ).toThrow();
  expect(cursor.offset).toBe(20);
});

it('keeps database-filter-only searches compatible with numeric totals', () => {
  const cursor = new SearchPageCursor(() => 'r');
  expect(cursor.request({ query: '', limit: 20 }, false)).not.toHaveProperty(
    'pagination_version'
  );
  expect(cursor.accept({ items: [{}], total: 2 })).toBe(true);
  expect(cursor.offset).toBe(1);
});

it('deduplicates appended resources without changing their first occurrence', () => {
  expect(
    appendSearchItems(
      [{ resource_id: 'a', title: 'first' }],
      [{ resource_id: 'a', title: 'later' }, { resource_id: 'b' }]
    )
  ).toEqual([{ resource_id: 'a', title: 'first' }, { resource_id: 'b' }]);
});
