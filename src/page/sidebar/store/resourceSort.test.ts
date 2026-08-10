import { parseResourceSorts } from './resourceSort';

it('keeps independent space sorts and migrates the legacy shared sort', () => {
  expect(
    parseResourceSorts(JSON.stringify({ sort_by: 'title', sort_order: 'asc' }))
  ).toEqual({
    private: { sort_by: 'title', sort_order: 'asc' },
    teamspace: { sort_by: 'title', sort_order: 'asc' },
  });

  expect(
    parseResourceSorts(
      JSON.stringify({
        private: { sort_by: 'manual', sort_order: 'asc' },
        teamspace: { sort_by: 'created_at', sort_order: 'desc' },
      })
    )
  ).toEqual({
    private: { sort_by: 'manual', sort_order: 'asc' },
    teamspace: { sort_by: 'created_at', sort_order: 'desc' },
  });
});
